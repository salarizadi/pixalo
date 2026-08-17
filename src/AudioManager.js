/**
 * Copyright (c) 2025-2026 Pixalo
 * @Repository: https://github.com/pixalo
 * @License: MIT
 */

class AudioManager {

    constructor (worker_id) {
        this.assets          = new Map();
        this.workerID        = worker_id;
        this.isWorker        = typeof importScripts !== 'undefined' && typeof DedicatedWorkerGlobalScope !== 'undefined';
        this.instances       = new Map();
        this.assetInstances  = new Map();
        this.listener        = null;
        this.masterVolume    = 1;
        this.nextInstanceId  = 0;
        this.isGloballyMuted = false;

        this.pendingRequests = new Map();
        this.nextRequestId   = 0;
        this.eventListeners  = new Map();

        this._handleWorker = this._handleWorker.bind(this);

        if (!this.isWorker) {
            try {
                this.context  = new (window.AudioContext || window.webkitAudioContext)();
                this.listener = this.context.listener;
                this._initSpatialAudio();
            } catch (e) {
                this.error(e);
            }
        }
    }

    async load (id, src, config = {}) {
        config.timeout = config.timeout || 60000;

        if (this.isWorker) {
            // An extra second to ensure the response returns to the worker
            const workerRequestTimeout = config.timeout + 1000;
            return this._sendWorkerRequest({
                action: 'audio_load',
                args  : [id, src, config]
            }, workerRequestTimeout);
        }

        return new Promise(async (resolve, reject) => {
            try {
                const controller = new AbortController();
                let timeoutId;

                if (config?.timeout && config.timeout > 0) {
                    timeoutId = setTimeout(() => {
                        controller.abort(new Error(`"${id}": Request timed out (${config.timeout}ms)`));
                    }, config.timeout);
                }

                const fetchOptions = {
                    mode: 'cors',
                    ...(config?.fetch || {})
                };

                // If the user gives a signal, link it to the controller.
                if (config?.fetch?.signal) {
                    const userSignal = config.fetch.signal;
                    userSignal.addEventListener('abort', () => {
                        controller.abort(userSignal.reason);
                    });
                }

                // Always use our signal (not the user's signal)
                fetchOptions.signal = controller.signal;

                const response = await fetch(src, fetchOptions);

                if (timeoutId)
                    clearTimeout(timeoutId);

                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

                const assetObject = {
                    id,
                    asset: audioBuffer,
                    config: {
                        ...config,
                        volume: config?.volume || 1,
                        loop: config?.loop || false,
                        autoplay: config?.autoplay || false,
                        muted: config?.muted || false,
                        allowMultiple: config?.allowMultiple !== false
                    }
                };

                this.assets.set(id, assetObject);

                this.trigger('load', {assetId: id, config: assetObject.config});

                resolve({
                    assetId: id,
                    duration: audioBuffer.duration,
                    numberOfChannels: audioBuffer.numberOfChannels,
                    sampleRate: audioBuffer.sampleRate,
                    config: assetObject.config
                });
            } catch (e) {
                if (e.name === 'AbortError') {
                    reject(new Error(`"${id}": Request timed out (${config.timeout}ms)`));
                } else {
                    reject(new Error(`"${id}": ${e.message}`));
                }
            }
        });
    }

    /** ======== EVENTS ======== */
    on (eventName, callback, config = {}) {
        config = {removeable: true, ...config};

        if (Array.isArray(eventName)) {
            eventName.forEach(e => this.on(e, callback, config));
            return this;
        }
        if (typeof eventName === 'object') {
            for (const k in eventName) this.on(k, eventName[k], config);
            return this;
        }

        if (!this.eventListeners.has(eventName))
            this.eventListeners.set(eventName, new Set());

        this.eventListeners.get(eventName).add({cb: callback, cfg: config});
        return this;
    }
    one (eventName, callback, config = {}) {
        config = {removeable: true, ...config};

        if (Array.isArray(eventName)) {
            eventName.forEach(e => this.one(e, callback, config));
            return this;
        }
        if (typeof eventName === 'object') {
            for (const k in eventName) this.one(k, eventName[k], config);
            return this;
        }

        const onceWrapper = (...args) => {
            callback.apply(this, args);
            this.off(eventName, onceWrapper);
        };

        this.on(eventName, onceWrapper, config);
        return this;
    }
    trigger (eventName, ...args) {
        if (this.isWorker) {
            if (Array.isArray(eventName)) {
                eventName.forEach(e => this.trigger(e, ...args));
                return this;
            }

            const set = this.eventListeners.get(eventName);
            if (set) {
                Array.from(set).forEach(({cb}) => cb.apply(this, args));
            }
            return this;
        }

        if (Array.isArray(eventName)) {
            eventName.forEach(e => this.trigger(e, ...args));
            return this;
        }

        const set = this.eventListeners.get(eventName);
        if (set) {
            Array.from(set).forEach(({cb}) => cb.apply(this, args));
        }

        if (this.worker) {
            this.worker.postMessage({
                wid: this.workerID,
                action: 'audio_trigger',
                args: [eventName, ...args]
            });
        }

        return this;
    }
    off (eventName, callback) {
        if (Array.isArray(eventName)) {
            eventName.forEach(e => this.off(e, callback));
            return this;
        }

        const set = this.eventListeners.get(eventName);
        if (!set) return this;

        if (callback) {
            for (const item of set) {
                if (item.cb === callback) {
                    set.delete(item);
                    break;
                }
            }
        } else {
            set.clear();
        }
        return this;
    }
    clearEvents () {
        for (const [eventName, set] of this.eventListeners.entries()) {
            for (const item of [...set])
                if (item.cfg?.removeable !== false) set.delete(item);
            if (set.size === 0) this.eventListeners.delete(eventName);
        }
    }
    /** ======== END ======== */

    /** ======== CONTROLS ======== */
    async play (id, options = {}) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_play', args: [id, options]});
        }

        const assetObject = this.assets.get(id);
        if (!assetObject) {
            return Promise.reject(new Error(`Audio asset with id '${id}' not found`));
        }

        const allowMultiple = options.allowMultiple !== undefined
            ? options.allowMultiple
            : (assetObject.config.allowMultiple !== false);

        const existingInstances = this.assetInstances.get(id);

        if (!allowMultiple && existingInstances && existingInstances.size > 0) {
            this.warn(`Asset '${id}' is already playing. Use allowMultiple:true or stop() first.`);
            return Promise.resolve({
                assetId: id,
                ignored: true,
                reason: 'already_playing'
            });
        }

        return new Promise((resolve, reject) => {
            try {
                if (this.context.state === 'suspended') {
                    this.context.resume();
                }

                const instanceId = this._generateInstanceId();
                const source = this.context.createBufferSource();
                const gainNode = this.context.createGain();

                source.buffer = assetObject.asset;
                const config = {...assetObject.config, ...options};

                const shouldBeMuted = config.muted || this.isGloballyMuted;
                gainNode.gain.value = shouldBeMuted ? 0 : (config.volume * this.masterVolume);

                source.loop = false;

                const spatialNodes = this._setupAudioChain(source, gainNode, config.spatial);

                const instanceData = {
                    instanceId,
                    assetId: id,
                    source,
                    gainNode,
                    spatialNodes,
                    spatialConfig: config.spatial || null,
                    startTime: this.context.currentTime,
                    pauseTime: 0,
                    duration: assetObject.asset.duration,
                    isPlaying: true,
                    isPaused: false,
                    config
                };

                this.instances.set(instanceId, instanceData);

                if (!this.assetInstances.has(id)) {
                    this.assetInstances.set(id, new Set());
                }
                this.assetInstances.get(id).add(instanceId);

                this._bindOnEnded(source, instanceId, instanceData);

                source.start(0);

                this.trigger('play', {instanceId, assetId: id});

                resolve({
                    instanceId,
                    assetId: id,
                    duration: assetObject.asset.duration
                });

            } catch (e) {
                this.error(`Failed to play audio '${id}':`, e.message);
                reject(new Error(`Failed to play audio: ${e.message}`));
            }
        });
    }
    pause (id) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_pause', args: [id]});
        }

        let instance = this.instances.get(id);

        if (instance && instance.isPlaying && !instance.isPaused) {
            const currentTime = this._getCurrentTimeSync(id);

            instance.pauseTime = currentTime;
            instance.isPlaying = false;
            instance.isPaused = true;

            try {
                instance.source.onended = null;
                instance.source.stop();
            } catch (e) {
                this.warn('Source already stopped:', e.message);
            }

            this.trigger('pause', {instanceId: id, assetId: instance.assetId, currentTime});
            return Promise.resolve(true);
        }

        const assetInstanceIds = this.assetInstances.get(id);
        if (assetInstanceIds && assetInstanceIds.size > 0) {
            Array.from(assetInstanceIds).forEach(instanceId => {
                const inst = this.instances.get(instanceId);
                if (inst && inst.isPlaying && !inst.isPaused) {
                    const currentTime = this._getCurrentTimeSync(instanceId);

                    inst.pauseTime = currentTime;
                    inst.isPlaying = false;
                    inst.isPaused = true;

                    try {
                        inst.source.onended = null;
                        inst.source.stop();
                    } catch (e) {
                        this.warn('Source already stopped:', e.message);
                    }

                    this.trigger('pause', {instanceId, assetId: id, currentTime});
                }
            });
            return Promise.resolve(true);
        }

        this.warn(`No active audio instance found for id '${id}' or already paused`);
        return Promise.resolve(true);
    }
    resume (id) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_resume', args: [id]});
        }

        let instance = this.instances.get(id);
        let instanceId = id;

        if (instance && instance.isPaused) {
            return this._resumeInstance(instanceId, instance);
        }

        const assetInstanceIds = this.assetInstances.get(id);
        if (assetInstanceIds) {
            for (const iId of assetInstanceIds) {
                const instanceData = this.instances.get(iId);
                if (instanceData && instanceData.isPaused) {
                    return this._resumeInstance(iId, instanceData);
                }
            }
        }

        this.warn(`No paused audio instance found for id '${id}'`);
        return Promise.resolve(true);
    }
    _resumeInstance (instanceId, instance) {
        const assetObject = this.assets.get(instance.assetId);
        if (!assetObject) {
            this.warn(`Asset not found for instance '${instanceId}'`);
            return Promise.resolve(true);
        }

        if (this.context.state === 'suspended')
            this.context.resume();

        const source   = this.context.createBufferSource();
        const gainNode = this.context.createGain();

        source.buffer = assetObject.asset;
        source.loop   = false;

        const shouldBeMuted = instance.config.muted || this.isGloballyMuted;
        gainNode.gain.value = shouldBeMuted ? 0 : (instance.config.volume * this.masterVolume);

        const spatialNodes  = this._setupAudioChain(source, gainNode, instance.spatialConfig);

        instance.source       = source;
        instance.gainNode     = gainNode;
        instance.spatialNodes = spatialNodes;
        instance.startTime    = this.context.currentTime - instance.pauseTime;
        instance.isPlaying    = true;
        instance.isPaused     = false;

        this._bindOnEnded(source, instanceId, instance);

        const remainingDuration = assetObject.asset.duration - instance.pauseTime;
        if (remainingDuration > 0) {
            source.start(0, instance.pauseTime);
        } else {
            source.start(0, 0);
        }

        this.trigger('resume', {instanceId, assetId: instance.assetId, currentTime: instance.pauseTime});
        return Promise.resolve(true);
    }
    stop (id) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_stop', args: [id]});
        }

        let instance = this.instances.get(id);

        if (instance) {
            try {
                instance.source.onended = null;
                instance.source.stop();
            } catch (e) {
                this.warn('Error stopping source:', e.message);
            }
            this.instances.delete(id);
            if (this.assetInstances.has(instance.assetId)) {
                this.assetInstances.get(instance.assetId).delete(id);
                if (this.assetInstances.get(instance.assetId).size === 0) {
                    this.assetInstances.delete(instance.assetId);
                }
            }

            this.trigger('stop', {instanceId: id, assetId: instance.assetId});
            return Promise.resolve(true);
        }

        const assetInstanceIds = this.assetInstances.get(id);
        if (assetInstanceIds && assetInstanceIds.size > 0) {
            Array.from(assetInstanceIds).forEach(instanceId => {
                const inst = this.instances.get(instanceId);
                if (inst) {
                    try {
                        inst.source.onended = null;
                        inst.source.stop();
                    } catch (e) {
                        this.warn('Error stopping source:', e.message);
                    }
                    this.instances.delete(instanceId);
                }
            });
            this.assetInstances.delete(id);
            this.trigger('stop', {assetId: id, allInstances: true});
            return Promise.resolve(true);
        }

        return Promise.resolve(true);
    }
    stopAsset (assetId) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_stopAsset', args: [assetId]});
        }

        const assetInstanceIds = this.assetInstances.get(assetId);
        if (assetInstanceIds) {
            const instancesToStop = Array.from(assetInstanceIds);
            instancesToStop.forEach(instanceId => this.stop(instanceId));
        }

        return Promise.resolve(true);
    }
    loop (id, loop) {
        if (this.isWorker) {
            if (loop === undefined) {
                return this._sendWorkerRequest({action: 'audio_loop', args: [id]});
            }
            return this._sendWorkerRequest({action: 'audio_loop', args: [id, loop]});
        }

        if (loop === undefined) {
            let instance = this.instances.get(id);

            if (instance)
                return Promise.resolve(instance.config.loop);

            const assetInstanceIds = this.assetInstances.get(id);
            if (assetInstanceIds) {
                for (const iId of assetInstanceIds) {
                    const inst = this.instances.get(iId);
                    if (inst) return Promise.resolve(inst.config.loop);
                }
            }

            const assetObject = this.assets.get(id);
            return Promise.resolve(assetObject ? assetObject.config.loop : false);
        }

        const loopValue = Boolean(loop);

        let instance = this.instances.get(id);
        if (instance) {
            instance.config.loop = loopValue;
            this.trigger('loopchange', {instanceId: id, assetId: instance.assetId, loop: loopValue});
        } else {
            const assetInstanceIds = this.assetInstances.get(id);
            if (assetInstanceIds) {
                assetInstanceIds.forEach(iId => {
                    const inst = this.instances.get(iId);
                    if (inst) {
                        inst.config.loop = loopValue;
                        this.trigger('loopchange', {instanceId: iId, assetId: id, loop: loopValue});
                    }
                });
            }
        }

        const assetObject = this.assets.get(id);
        if (assetObject) {
            assetObject.config.loop = loopValue;
            if (!instance && !this.assetInstances.has(id)) {
                this.trigger('loopchange', {assetId: id, loop: loopValue});
            }
        }

        return Promise.resolve(true);
    }
    seek (id, time) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_seek', args: [id, time]});
        }

        let instance = this.instances.get(id);

        if (instance) {
            return this._seekInstance(id, instance, time);
        }

        const assetInstanceIds = this.assetInstances.get(id);
        if (assetInstanceIds && assetInstanceIds.size > 0) {
            Array.from(assetInstanceIds).forEach(instanceId => {
                const inst = this.instances.get(instanceId);
                if (inst) {
                    this._seekInstance(instanceId, inst, time);
                }
            });
            return Promise.resolve(true);
        }

        this.warn(`No audio instance found for id '${id}'`);
        return Promise.resolve(true);
    }
    _seekInstance (instanceId, instance, time) {
        const assetObject = this.assets.get(instance.assetId);
        if (!assetObject) {
            this.warn(`Asset not found for instance '${instanceId}'`);
            return Promise.resolve(true);
        }

        const duration = assetObject.asset.duration;
        const seekTime = Math.max(0, Math.min(duration, time));

        try {
            instance.source.onended = null;
            instance.source.stop();
        } catch (e) {
            this.warn('Error stopping source for seek:', e.message);
        }

        const source   = this.context.createBufferSource();
        const gainNode = this.context.createGain();

        source.buffer = assetObject.asset;
        source.loop   = false;

        const shouldBeMuted = instance.config.muted || this.isGloballyMuted;
        gainNode.gain.value = shouldBeMuted ? 0 : (instance.config.volume * this.masterVolume);

        const spatialNodes  = this._setupAudioChain(source, gainNode, instance.spatialConfig);

        instance.source       = source;
        instance.gainNode     = gainNode;
        instance.spatialNodes = spatialNodes;
        instance.startTime    = this.context.currentTime - seekTime;
        instance.isPlaying    = true;
        instance.isPaused     = false;

        this._bindOnEnded(source, instanceId, instance);

        source.start(0, seekTime);

        this.trigger('seek', {instanceId, assetId: instance.assetId, seekTime});
        return Promise.resolve(true);
    }
    /** ======== END ======== */

    /** ======== VOLUME ======== */
    setVolume (id, volume) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_setVolume', args: [id, volume]});
        }

        let instance = this.instances.get(id);

        if (instance) {
            instance.config.volume = volume;
            instance.gainNode.gain.value = (instance.config.muted || this.isGloballyMuted)
                ? 0
                : (volume * this.masterVolume);

            this.trigger('volumechange', {instanceId: id, assetId: instance.assetId, volume});
            return Promise.resolve(true);
        }

        const assetInstanceIds = this.assetInstances.get(id);
        if (assetInstanceIds) {
            assetInstanceIds.forEach(iId => {
                const inst = this.instances.get(iId);
                if (inst) {
                    inst.config.volume = volume;
                    inst.gainNode.gain.value = (inst.config.muted || this.isGloballyMuted)
                        ? 0
                        : (volume * this.masterVolume);

                    this.trigger('volumechange', {instanceId: iId, assetId: id, volume});
                }
            });
            return Promise.resolve(true);
        }

        return Promise.resolve(true);
    }
    setAssetVolume (assetId, volume) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_setAssetVolume', args: [assetId, volume]});
        }

        this.instances.forEach((instance) => {
            if (instance.assetId === assetId) {
                instance.config.volume = volume;
                instance.gainNode.gain.value = (instance.config.muted || this.isGloballyMuted)
                    ? 0
                    : (volume * this.masterVolume);

                this.trigger('volumechange', {instanceId: instance.instanceId, assetId, volume});
            }
        });

        const assetObject = this.assets.get(assetId);
        if (assetObject) {
            assetObject.config.volume = volume;
        }

        return Promise.resolve(true);
    }
    setMasterVolume (volume) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_setMasterVolume', args: [volume]});
        }

        this.masterVolume = Math.max(0, Math.min(1, volume));

        this.instances.forEach((instance) => {
            if (!instance.config.muted && !this.isGloballyMuted) {
                instance.gainNode.gain.value = instance.config.volume * this.masterVolume;
            }
        });

        this.trigger('volumechange', {type: 'master', volume});

        return Promise.resolve(true);
    }
    /** ======== END ======== */

    /** ======== SPATIAL ======== */
    setListenerPosition (x, y, z = 0) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_setListenerPosition', args: [x, y, z]});
        }

        if (this.listener.positionX) {
            this.listener.positionX.value = x;
            this.listener.positionY.value = y;
            this.listener.positionZ.value = z;
        } else {
            this.listener.setPosition(x, y, z);
        }

        return Promise.resolve(true);
    }
    setListenerOrientation (forwardX, forwardY, forwardZ = 0, upX = 0, upY = 1, upZ = 0) {
        if (this.isWorker) {
            return this._sendWorkerRequest({
                action: 'audio_setListenerOrientation',
                args: [forwardX, forwardY, forwardZ, upX, upY, upZ]
            });
        }

        if (this.listener.forwardX) {
            this.listener.forwardX.value = forwardX;
            this.listener.forwardY.value = forwardY;
            this.listener.forwardZ.value = forwardZ;
            this.listener.upX.value = upX;
            this.listener.upY.value = upY;
            this.listener.upZ.value = upZ;
        } else {
            this.listener.setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
        }

        return Promise.resolve(true);
    }
    setSpatialPosition (id, x, y, z = 0) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_setSpatialPosition', args: [id, x, y, z]});
        }

        let instance = this.instances.get(id);

        if (instance && instance.spatialNodes && instance.spatialNodes.panner) {
            this._setPannerPosition(instance.spatialNodes.panner, x, y, z);
            return Promise.resolve(true);
        }

        const assetInstanceIds = this.assetInstances.get(id);
        if (assetInstanceIds) {
            assetInstanceIds.forEach(iId => {
                const inst = this.instances.get(iId);
                if (inst && inst.spatialNodes && inst.spatialNodes.panner) {
                    this._setPannerPosition(inst.spatialNodes.panner, x, y, z);
                }
            });
            return Promise.resolve(true);
        }

        this.warn(`No spatial audio found for id '${id}'`);
        return Promise.resolve(true);
    }
    setSpatialOrientation (id, x, y, z = 0) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_setSpatialOrientation', args: [id, x, y, z]});
        }

        let instance = this.instances.get(id);

        if (instance && instance.spatialNodes && instance.spatialNodes.panner) {
            this._setPannerOrientation(instance.spatialNodes.panner, x, y, z);
            return Promise.resolve(true);
        }

        const assetInstanceIds = this.assetInstances.get(id);
        if (assetInstanceIds) {
            assetInstanceIds.forEach(iId => {
                const inst = this.instances.get(iId);
                if (inst && inst.spatialNodes && inst.spatialNodes.panner) {
                    this._setPannerOrientation(inst.spatialNodes.panner, x, y, z);
                }
            });
            return Promise.resolve(true);
        }

        this.warn(`No spatial audio found for id '${id}'`);
        return Promise.resolve(true);
    }
    playSpatial (assetId, x, y, z = 0, options = {}) {
        const spatialOptions = {
            ...options,
            spatial: {
                position: {x, y, z},
                panningModel: 'HRTF',
                distanceModel: 'inverse',
                refDistance: 1,
                maxDistance: 10000,
                rolloffFactor: 1,
                ...options.spatial
            }
        };
        return this.play(assetId, spatialOptions);
    }
    updateSpatial (id, config) {
        if (config.position)
            this.setSpatialPosition(id, config.position.x, config.position.y, config.position.z);

        if (config.orientation)
            this.setSpatialOrientation(id, config.orientation.x, config.orientation.y, config.orientation.z);

        if (config.volume !== undefined)
            this.setVolume(id, config.volume);

        return Promise.resolve(true);
    }
    /** ======== END ======== */

    /** ======== STATUS ======== */
    exists (id) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_exists', args: [id]});
        }

        if (this.instances.has(id)) return Promise.resolve(true);

        const assetInstanceIds = this.assetInstances.get(id);
        return Promise.resolve(assetInstanceIds ? assetInstanceIds.size > 0 : false);
    }
    isPlaying (id) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_isPlaying', args: [id]});
        }

        let instance = this.instances.get(id);

        if (!instance) {
            for (const instanceData of this.instances.values()) {
                if (instanceData.assetId === id && instanceData.isPlaying) {
                    return Promise.resolve(true);
                }
            }
            return Promise.resolve(false);
        }

        return Promise.resolve(instance ? instance.isPlaying : false);
    }
    isPaused (id) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_isPaused', args: [id]});
        }

        let instance = this.instances.get(id);

        if (!instance) {
            for (const instanceData of this.instances.values()) {
                if (instanceData.assetId === id && instanceData.isPaused) {
                    return Promise.resolve(true);
                }
            }
            return Promise.resolve(false);
        }

        return Promise.resolve(instance ? instance.isPaused : false);
    }
    isMuted (id) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_isMuted', args: id !== undefined ? [id] : []});
        }

        if (id === undefined) {
            return Promise.resolve(this.isGloballyMuted);
        }

        let instance = this.instances.get(id);
        if (instance) {
            return Promise.resolve(instance.config.muted || this.isGloballyMuted);
        }

        const assetInstanceIds = this.assetInstances.get(id);
        if (assetInstanceIds) {
            for (const iId of assetInstanceIds) {
                const inst = this.instances.get(iId);
                if (inst) return Promise.resolve(inst.config.muted || this.isGloballyMuted);
            }
        }

        const assetObject = this.assets.get(id);
        if (assetObject) {
            return Promise.resolve(assetObject.config.muted || this.isGloballyMuted);
        }

        return Promise.resolve(false);
    }
    getAssetInstances (assetId) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_getAssetInstances', args: [assetId]});
        }

        const instances = [];
        const assetInstanceIds = this.assetInstances.get(assetId);
        if (assetInstanceIds) {
            for (const instanceId of assetInstanceIds) {
                const instance = this.instances.get(instanceId);
                if (instance) {
                    instances.push({
                        instanceId,
                        isPlaying: instance.isPlaying,
                        isPaused: instance.isPaused,
                        currentTime: this._getCurrentTimeSync(instanceId)
                    });
                }
            }
        }
        return Promise.resolve(instances);
    }
    getDuration (assetId) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_getDuration', args: [assetId]});
        }

        const assetObject = this.assets.get(assetId);
        return Promise.resolve(assetObject ? assetObject.asset.duration : 0);
    }
    getCurrentTime (id) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_getCurrentTime', args: [id]});
        }

        return Promise.resolve(this._getCurrentTimeSync(id));
    }
    getDistance (id) {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_getDistance', args: [id]});
        }

        return Promise.resolve(this.getDistanceSync(id));
    }
    /** ======== END ======== */

    /** ======== BATCH OPERATION ======== */
    muteAll () {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_muteAll', args: []});
        }

        this.isGloballyMuted = true;
        this.instances.forEach((instance) => {
            instance.gainNode.gain.value = 0;
        });

        this.trigger('mute', {type: 'global'});

        return Promise.resolve(true);
    }
    unmuteAll () {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_unmuteAll', args: []});
        }

        this.isGloballyMuted = false;
        this.instances.forEach((instance) => {
            if (!instance.config.muted) {
                instance.gainNode.gain.value = instance.config.volume * this.masterVolume;
            }
        });

        this.trigger('unmute', {type: 'global'});

        return Promise.resolve(true);
    }
    pauseAll () {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_pauseAll', args: []});
        }

        const activeInstances = Array.from(this.instances.keys()).filter(instanceId => {
            const instance = this.instances.get(instanceId);
            return instance.isPlaying && !instance.isPaused;
        });
        activeInstances.forEach(instanceId => this.pause(instanceId));

        return Promise.resolve(true);
    }
    resumeAll () {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_resumeAll', args: []});
        }

        const pausedInstances = Array.from(this.instances.keys()).filter(instanceId => {
            const instance = this.instances.get(instanceId);
            return instance.isPaused;
        });
        pausedInstances.forEach(instanceId => this.resume(instanceId));

        return Promise.resolve(true);
    }
    stopAll () {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_stopAll', args: []});
        }

        this.instances.forEach((instance) => {
            try {
                instance.source.stop();
            } catch (e) {
                // Source might already be stopped
            }
        });

        this.instances.clear();
        this.assetInstances.clear();

        return Promise.resolve(true);
    }
    /** ======== END ======== */

    /** ======== CLEANER ======== */
    delete (id) {
        if (this.isWorker) {
            return this._sendWorkerRequest({ action: 'audio_delete', args: [id] });
        }

        let instance = this.instances.get(id);
        if (instance) {
            try { instance.source.stop() } catch {}
            this.instances.delete(id);
            if (this.assetInstances.has(instance.assetId)) {
                this.assetInstances.get(instance.assetId).delete(id);
                if (this.assetInstances.get(instance.assetId).size === 0)
                    this.assetInstances.delete(instance.assetId);
            }
            return Promise.resolve(true);
        }

        const assetInstanceIds = this.assetInstances.get(id);
        if (assetInstanceIds)
            Array.from(assetInstanceIds).forEach(iId => this.delete(iId));

        this.assets.delete(id);
        return Promise.resolve(true);
    }
    cleanup () {
        if (this.isWorker) {
            return this._sendWorkerRequest({action: 'audio_cleanup', args: []});
        }

        this.stopAll();
        this.assets.clear();

        if (this.context && this.context.state !== 'closed')
            this.context.close();

        this.instances.clear();
        this.listener = null;
        this.masterVolume = 1;
        this.nextInstanceId = 0;
        this.isGloballyMuted = false;
        this.eventListeners.clear();

        return Promise.resolve(true);
    }
    /** ======== END ======== */

    /** ======== LOGS ======== */
    warn (...args) {
        console.warn('%c[AudioManager WARN]', 'color: #ff9800;', ...args);
        return this;
    }
    error (...args) {
        console.error('%c[AudioManager ERROR]', 'color: #f44336;', ...args);
        return this;
    }
    /** ======== END ======== */

    /** ======== PRIVATE METHODS ======== */
    _bindOnEnded (source, instanceId, instance) {
        source.onended = () => {
            try { source.disconnect(); } catch(e) {}

            this.instances.delete(instanceId);
            if (this.assetInstances.has(instance.assetId)) {
                this.assetInstances.get(instance.assetId).delete(instanceId);
                if (this.assetInstances.get(instance.assetId).size === 0) {
                    this.assetInstances.delete(instance.assetId);
                }
            }

            this.trigger('ended', {instanceId, assetId: instance.assetId});

            if (instance.config.loop) {
                this.trigger('looped', {instanceId, assetId: instance.assetId});
                this.play(instance.assetId, instance.config).catch(err => {
                    this.warn('Loop play failed:', err.message);
                });
            }
        };
    }
    _handleWorker (event) {
        let {data} = event;
        if (!data) return;

        if (data.messageId && this.pendingRequests.has(data.messageId)) {
            const pending = this.pendingRequests.get(data.messageId);
            clearTimeout(pending.timer);
            this.pendingRequests.delete(data.messageId);

            if (data.error) pending.reject(new Error(data.error));
            else pending.resolve(data.result);
            return;
        }

        if (this.isWorker && data.action === 'audio_trigger') {
            const [eventName, ...eventArgs] = data.args;
            this.trigger(eventName, ...eventArgs);
            return;
        }

        if (this.isWorker) return;

        const action = data.action ?? '';
        if (!action.startsWith('audio_')) return;

        const method = action.replace('audio_', '');
        if (typeof this[method] !== 'function') return;

        try {
            const result = this[method](...data.args);

            if (data.messageId) {
                Promise.resolve(result).then(value => {
                    this.worker?.postMessage({
                        wid: this.workerID,
                        messageId: data.messageId,
                        result: value
                    });
                }).catch(err => {
                    this.worker?.postMessage({
                        wid: this.workerID,
                        messageId: data.messageId,
                        error: err.message
                    });
                });
            }
        } catch (err) {
            this.error(`Worker request failed: ${method}`, err.message);
            if (data.messageId && this.worker) {
                this.worker.postMessage({
                    wid: this.workerID,
                    messageId: data.messageId,
                    error: err.message
                });
            }
        }
    }
    _sendWorker (data) {
        postMessage({
            wid: this.workerID,
            ...data
        });
    }
    _sendWorkerRequest (data, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const messageId = `req_${this.nextRequestId++}_${performance.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

            const timer = setTimeout(() => {
                if (this.pendingRequests.has(messageId)) {
                    this.pendingRequests.delete(messageId);
                    reject(new Error(`AudioManager request timeout: ${data.action}`));
                }
            }, timeout);

            this.pendingRequests.set(messageId, { resolve, reject, timer });

            const payload = {
                wid: this.workerID,
                messageId,
                ...data
            };

            if (this.isWorker) {
                postMessage(payload);
            } else if (this.worker) {
                this.worker.postMessage(payload);
            } else {
                clearTimeout(timer);
                this.pendingRequests.delete(messageId);
                reject(new Error('No worker communication channel available'));
            }
        });
    }
    _initSpatialAudio () {
        if (this.listener.forwardX) {
            this.listener.forwardX.value = 0;
            this.listener.forwardY.value = 0;
            this.listener.forwardZ.value = -1;
            this.listener.upX.value = 0;
            this.listener.upY.value = 1;
            this.listener.upZ.value = 0;
            this.listener.positionX.value = 0;
            this.listener.positionY.value = 0;
            this.listener.positionZ.value = 0;
        } else {
            this.listener.setOrientation(0, 0, -1, 0, 1, 0);
            this.listener.setPosition(0, 0, 0);
        }
    }
    _generateInstanceId () {
        return `instance_${this.nextInstanceId++}_${performance.now().toFixed(0)}`;
    }
    _setupAudioChain (source, gainNode, spatialConfig) {
        if (spatialConfig) {
            const spatialNodes = this._createSpatialNodes(spatialConfig);
            source.connect(gainNode);
            gainNode.connect(spatialNodes.panner);
            spatialNodes.panner.connect(this.context.destination);
            return spatialNodes;
        } else {
            source.connect(gainNode);
            gainNode.connect(this.context.destination);
            return null;
        }
    }
    _createSpatialNodes (spatialConfig) {
        const panner = this.context.createPanner();

        panner.panningModel   = spatialConfig.panningModel || 'HRTF';
        panner.distanceModel  = spatialConfig.distanceModel || 'inverse';
        panner.refDistance    = spatialConfig.refDistance || 1;
        panner.maxDistance    = spatialConfig.maxDistance || 10000;
        panner.rolloffFactor  = spatialConfig.rolloffFactor || 1;
        panner.coneInnerAngle = spatialConfig.coneInnerAngle || 360;
        panner.coneOuterAngle = spatialConfig.coneOuterAngle || 360;
        panner.coneOuterGain  = spatialConfig.coneOuterGain || 0;

        const pos = spatialConfig.position || {x: 0, y: 0, z: 0};
        if (panner.positionX) {
            panner.positionX.value = pos.x;
            panner.positionY.value = pos.y;
            panner.positionZ.value = pos.z;
        } else {
            panner.setPosition(pos.x, pos.y, pos.z);
        }

        const orient = spatialConfig.orientation || {x: 1, y: 0, z: 0};
        if (panner.orientationX) {
            panner.orientationX.value = orient.x;
            panner.orientationY.value = orient.y;
            panner.orientationZ.value = orient.z;
        } else {
            panner.setOrientation(orient.x, orient.y, orient.z);
        }

        return {panner};
    }
    _setPannerPosition (panner, x, y, z) {
        if (panner.positionX) {
            panner.positionX.value = x;
            panner.positionY.value = y;
            panner.positionZ.value = z;
        } else {
            panner.setPosition(x, y, z);
        }
    }
    _setPannerOrientation (panner, x, y, z) {
        if (panner.orientationX) {
            panner.orientationX.value = x;
            panner.orientationY.value = y;
            panner.orientationZ.value = z;
        } else {
            panner.setOrientation(x, y, z);
        }
    }
    _getCurrentTimeSync (id) {
        if (this.isWorker) return 0;

        let instance = this.instances.get(id);

        if (!instance) {
            for (const instanceData of this.instances.values()) {
                if (instanceData.assetId === id) {
                    instance = instanceData;
                    break;
                }
            }
        }

        if (!instance) return 0;

        if (instance.isPaused) {
            return instance.pauseTime;
        } else if (instance.isPlaying) {
            const elapsed = this.context.currentTime - instance.startTime;
            return Math.min(elapsed, instance.duration);
        }

        return 0;
    }
    getDistanceSync (id) {
        if (this.isWorker) return null;

        let instance = this.instances.get(id);

        if (!instance) {
            for (const instanceData of this.instances.values()) {
                if (instanceData.assetId === id && instanceData.spatialNodes && instanceData.spatialNodes.panner) {
                    instance = instanceData;
                    break;
                }
            }
        }

        if (!instance || !instance.spatialNodes || !instance.spatialNodes.panner) return null;

        const panner = instance.spatialNodes.panner;
        const listener = this.listener;

        let px, py, pz, lx, ly, lz;

        if (panner.positionX) {
            px = panner.positionX.value;
            py = panner.positionY.value;
            pz = panner.positionZ.value;
            lx = listener.positionX.value;
            ly = listener.positionY.value;
            lz = listener.positionZ.value;
        } else {
            return null;
        }

        return Math.sqrt(
            Math.pow(px - lx, 2) +
            Math.pow(py - ly, 2) +
            Math.pow(pz - lz, 2)
        );
    }
    /** ======== END ======== */

}

export default AudioManager;