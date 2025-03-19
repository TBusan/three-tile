/**
 *@description: Tile Map Mesh 瓦片地图模型
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import {
	TransformNode,
	Vector3,
	Vector2,
	Camera,
	Scene,
	Observable,
	Mesh,
	Material
} from "@babylonjs/core";
import { ITileGeometryLoader, ITileLoader, ITileMaterialLoader, LoaderFactory, TileLoader } from "../loader/index2";
import { ISource } from "../source/index2";
import { Tile } from "../tile/index2";
import { IProjection, ProjMCT, ProjectFactory } from "./projection/index2";
import { attachEvent, getLocalInfoFromScreen, getLocalInfoFromWorld } from "./util2";
import { TileMapLoader } from "./TileMapLoader2";

/**
 * TileMap Event Map
 */
export interface TileMapEventMap {
	onReady: Observable<void>;
	onUpdate: Observable<number>;
	onTileCreated: Observable<Tile>;
	onTileLoaded: Observable<Tile>;
	onProjectionChanged: Observable<IProjection>;
	onSourceChanged: Observable<ISource | ISource[] | undefined>;
	onLoadingStart: Observable<{itemsLoaded: number; itemsTotal: number}>;
	onLoadingError: Observable<string>;
	onLoadingComplete: Observable<void>;
	onLoadingProgress: Observable<{url: string; itemsLoaded: number; itemsTotal: number}>;
	onParsingEnd: Observable<string>;
}

type ProjectCenterLongitude = 0 | 90 | -90;

export type MapParams = {
	loader?: ITileLoader;
	rootTile?: Tile;
	imgSource: ISource[] | ISource;
	demSource?: ISource;
	minLevel?: number;
	maxLevel?: number;
	lon0?: ProjectCenterLongitude;
};

export class TileMap extends TransformNode {
	public readonly name = "map";
	private _lastUpdateTime = 0;

	public readonly isLOD = true;
	public autoUpdate = true;
	public updateInterval = 100;

	public readonly rootTile: Tile;
	public readonly loader: ITileLoader;
	public readonly _loader = new TileMapLoader();

	private _minLevel = 2;
	public get minLevel() {
		return this._minLevel;
	}
	public set minLevel(value: number) {
		this._minLevel = value;
	}

	private _maxLevel = 19;
	public get maxLevel() {
		return this._maxLevel;
	}
	public set maxLevel(value: number) {
		this._maxLevel = value;
	}

	public get lon0() {
		return this.projection.lon0;
	}
	public set lon0(value) {
		if (this.projection.lon0 !== value) {
			if (value != 0 && this.minLevel < 1) {
				console.warn(`Map centralMeridian is ${this.lon0}, minLevel must > 0`);
			}
			this.projection = ProjectFactory.createFromID(this.projection.ID, value);
			this.reload();
		}
	}

	private _projection: IProjection = new ProjMCT(0);
	public get projection(): IProjection {
		return this._projection;
	}
	private set projection(proj: IProjection) {
		if (proj.ID != this.projection.ID || proj.lon0 != this.lon0) {
			this.rootTile.scaling.set(proj.mapWidth, proj.mapHeight, proj.mapDepth);
			this._projection = proj;
			this.reload();
			this.events.onProjectionChanged.notifyObservers(proj);
		}
	}

	private _imgSource: ISource[] = [];
	public get imgSource(): ISource[] {
		return this._imgSource;
	}
	public set imgSource(value: ISource | ISource[]) {
		const sources = Array.isArray(value) ? value : [value];
		if (sources.length === 0) {
			throw new Error("imgSource can not be empty");
		}
		this.projection = ProjectFactory.createFromID(sources[0].projectionID, this.projection.lon0);
		this._imgSource = sources;
		this.loader.imgSource = sources;
		this.events.onSourceChanged.notifyObservers(value);
	}

	private _demSource: ISource | undefined;
	public get demSource(): ISource | undefined {
		return this._demSource;
	}
	public set demSource(value: ISource | undefined) {
		this._demSource = value;
		this.loader.demSource = this._demSource;
		this.events.onSourceChanged.notifyObservers(value);
	}

	private _LODThreshold = 1;
	public get LODThreshold() {
		return this._LODThreshold;
	}
	public set LODThreshold(value) {
		this._LODThreshold = value;
	}

	public get useWorker() {
		return this.loader.useWorker;
	}
	public set useWorker(value: boolean) {
		this.loader.useWorker = value;
	}

	public readonly events: TileMapEventMap;

	public static create(params: MapParams) {
		return new TileMap("TileMap", null, params);
	}

	constructor(name: string, scene: Scene | null, params: MapParams) {
		super(name, scene);
		
		this.events = {
			onReady: new Observable<void>(),
			onUpdate: new Observable<number>(),
			onTileCreated: new Observable<Tile>(),
			onTileLoaded: new Observable<Tile>(),
			onProjectionChanged: new Observable<IProjection>(),
			onSourceChanged: new Observable<ISource | ISource[] | undefined>(),
			onLoadingStart: new Observable<{itemsLoaded: number; itemsTotal: number}>(),
			onLoadingError: new Observable<string>(),
			onLoadingComplete: new Observable<void>(),
			onLoadingProgress: new Observable<{url: string; itemsLoaded: number; itemsTotal: number}>(),
			onParsingEnd: new Observable<string>()
		};

		const {
			loader = new TileLoader(),
			rootTile = new Tile(),
			minLevel = 2,
			maxLevel = 19,
			imgSource,
			demSource,
			lon0 = 0,
		} = params;

		this.loader = loader;

		rootTile.scaling.set(
			this.projection.mapWidth,
			this.projection.mapHeight,
			this.projection.mapDepth
		);
		this.rootTile = rootTile;
		this.addChild(rootTile);

		this.minLevel = minLevel;
		this.maxLevel = maxLevel;

		this.imgSource = imgSource;
		this.demSource = demSource;

		this.lon0 = lon0;

		rootTile.computeWorldMatrix(true);
		attachEvent(this);
	}

	public update(camera: Camera) {
		const currentTime = performance.now();
		const deltaTime = currentTime - this._lastUpdateTime;

		if (deltaTime > this.updateInterval) {
			this._loader.attcth(this.loader, this.projection);
			try {
				this.rootTile.update({
					camera,
					loader: this._loader,
					minLevel: this.minLevel,
					maxLevel: this.maxLevel,
					LODThreshold: this.LODThreshold,
				});
				
				if (this.rootTile._mesh) {
					this.rootTile._mesh.receiveShadows = this.receiveShadows;
				}
			} catch (e) {
				console.error("Error on loading tile data.", e);
			}
			this._lastUpdateTime = currentTime;
			this.events.onUpdate.notifyObservers(deltaTime);
		}
	}

	public reload() {
		this.rootTile.reload();
	}

	public dispose() {
		this.parent?.removeChild(this);
		this.reload();
		super.dispose();
	}

	public geo2pos(geo: Vector3) {
		return this.geo2map(geo);
	}

	public geo2map(geo: Vector3) {
		const pos = this.projection.project(geo.x, geo.y);
		return new Vector3(pos.x, pos.y, geo.z);
	}

	public geo2world(geo: Vector3) {
		const localPos = this.geo2pos(geo);
		return Vector3.TransformCoordinates(localPos, this.getWorldMatrix());
	}

	public pos2geo(pos: Vector3) {
		return this.map2geo(pos);
	}

	public map2geo(pos: Vector3) {
		const position = this.projection.unProject(pos.x, pos.y);
		return new Vector3(position.lon, position.lat, pos.z);
	}

	public world2geo(world: Vector3) {
		const localPos = Vector3.TransformCoordinates(world, this.getWorldMatrix().invert());
		return this.pos2geo(localPos);
	}

	public getLocalInfoFromGeo(geo: Vector3) {
		const pointer = this.geo2world(geo);
		return getLocalInfoFromWorld(this, pointer);
	}

	public getLocalInfoFromWorld(pos: Vector3) {
		return getLocalInfoFromWorld(this, pos);
	}

	public getLocalInfoFromScreen(camera: Camera, pointer: Vector2) {
		return getLocalInfoFromScreen(camera, this, pointer);
	}

	public get downloading() {
		return Tile.downloadThreads;
	}

	public static get loaderInfo() {
		return LoaderFactory.getLoadersInfo();
	}

	public static registerImgLoader(loader: ITileMaterialLoader) {
		LoaderFactory.registerMaterialLoader(loader);
		return loader;
	}

	public static registerDEMloader(loader: ITileGeometryLoader) {
		LoaderFactory.registerGeometryLoader(loader);
		return loader;
	}
}
