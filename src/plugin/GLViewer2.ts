/**
 *@description: Babylonjs 3D scene initialize
 *@author: 郭江峰
 *@date: 2023-04-05
 */

import {
	Engine,
	Scene,
	Vector3,
	Color3,
	Color4,
	ArcRotateCamera,
	HemisphericLight,
	DirectionalLight,
	Observable
} from "@babylonjs/core";

/**
 * GlViewer event map
 */
export interface GLViewerEventMap {
	update: { delta: number };
}

/**
 * GlViewer options
 */
type GLViewerOptions = {
	antialias?: boolean;
	stencil?: boolean;
	logarithmicDepthBuffer?: boolean;
};

/**
 * babylonjs scene viewer initialize class
 */
export class GLViewer {
	public readonly scene: Scene;
	public readonly engine: Engine;
	public readonly camera: ArcRotateCamera;
	public readonly ambLight: HemisphericLight;
	public readonly dirLight: DirectionalLight;
	public readonly container: HTMLElement;
	private readonly _onUpdateObservable: Observable<{ delta: number }>;

	private _fogFactor = 1.0;
	public get fogFactor() {
		return this._fogFactor;
	}
	public set fogFactor(value) {
		this._fogFactor = value;
		this._updateFog();
	}

	public get width() {
		return this.container.clientWidth;
	}

	public get height() {
		return this.container.clientHeight;
	}

	constructor(container: HTMLElement | string, options: GLViewerOptions = {}) {
		const el = typeof container === "string" ? document.querySelector(container) : container;
		if (el instanceof HTMLElement) {
			const { antialias = false, stencil = true } = options;

			this.container = el;
			this._onUpdateObservable = new Observable();

			// Create canvas and engine
			const canvas = document.createElement("canvas");
			this.container.appendChild(canvas);
			
			this.engine = new Engine(canvas, antialias, {
				stencil,
				preserveDrawingBuffer: true,
				adaptToDeviceRatio: true
			});

			this.scene = this._createScene();
			this.camera = this._createCamera();
			this.ambLight = this._createAmbLight();
			this.dirLight = this._createDirLight();

			window.addEventListener("resize", this.resize.bind(this));
			this.resize();

			// Start rendering loop
			this.engine.runRenderLoop(() => {
				this.scene.render();
				const delta = this.engine.getDeltaTime() / 1000;
				this._onUpdateObservable.notifyObservers({ delta });
			});
		} else {
			throw new Error(`${container} not found!`);
		}
	}

	private _createScene() {
		const scene = new Scene(this.engine);
		const backColor = Color3.FromHexString("#DBF0FF");
		scene.clearColor = new Color4(backColor.r, backColor.g, backColor.b, 1);
		scene.fogMode = Scene.FOGMODE_EXP;
		scene.fogDensity = 0;
		scene.fogColor = backColor;
		return scene;
	}

	private _createCamera() {
		const camera = new ArcRotateCamera("camera", 0, 0, 30000, Vector3.Zero(), this.scene);
		camera.setPosition(new Vector3(0, 30000, 0));
		camera.target = new Vector3(0, 0, -3000);
		
		// Configure camera
		camera.lowerRadiusLimit = 0.1;
		camera.upperRadiusLimit = 30000;
		camera.upperBetaLimit = 1.2;
		camera.panningSensibility = 5;
		camera.wheelDeltaPercentage = 0.1;
		camera.angularSensibilityX = 500;
		camera.angularSensibilityY = 500;

		camera.attachControl(this.container, true);
		
		// Update fog when camera moves
		camera.onViewMatrixChangedObservable.add(() => {
			this._updateFog();
		});

		return camera;
	}

	private _createAmbLight() {
		return new HemisphericLight("ambLight", new Vector3(0, 1, 0), this.scene);
	}

	private _createDirLight() {
		const light = new DirectionalLight("dirLight", new Vector3(0, -1, -0.5), this.scene);
		light.position = new Vector3(0, 2000, 1000);
		return light;
	}

	private _updateFog() {
		const dist = this.camera.radius;
		const polar = Math.PI / 2 - this.camera.beta;
		this.scene.fogDensity = (polar / (dist + 5)) * this.fogFactor * 0.25;
	}

	public resize() {
		this.engine.resize();
		return this;
	}

	/**
	 * Fly to a position
	 */
	public flyTo(centerPosition: Vector3, cameraPosition: Vector3, animate = true, onComplete?: () => void) {
		if (animate) {
			// First move up
			this.camera.setPosition(new Vector3(this.camera.position.x, 10000, 0));
			
			// Then animate to target
			this.scene.beginAnimation(this.camera, 0, 2000, false, 1, () => {
				this.camera.setTarget(centerPosition);
				this.camera.setPosition(cameraPosition);
				onComplete?.();
			});
		} else {
			this.camera.setTarget(centerPosition);
			this.camera.setPosition(cameraPosition);
		}
	}

	public addUpdateListener(callback: (data: GLViewerEventMap["update"]) => void) {
		return this._onUpdateObservable.add(callback);
	}
}
