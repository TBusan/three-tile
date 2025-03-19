/**
 *@description: LOD Tile mesh
 *@author: 郭江峰
 *@date: 2023-04-05
 */

import {
	TransformNode,
	Vector3,
	Camera,
	Mesh,
	Material,
	BoundingBox,
	Frustum,
	Observable,
	Scene
} from "@babylonjs/core";
import { ITileLoader } from "../loader/index2";
import { getDistance, getTileSize, createChildren, LODAction, LODEvaluate } from "./util2";

const THREADSNUM = 8;

/**
 * Tile update parameters
 */
export type TileUpdateParames = {
	camera: Camera;
	loader: ITileLoader;
	minLevel: number;
	maxLevel: number;
	LODThreshold: number;
};

// Default values
// const tempVec3 = new Vector3();
// const tempMatrix = new Matrix();
const tileBox = new BoundingBox(new Vector3(-0.5, -0.5, 0), new Vector3(0.5, 0.5, 9));
// const frustum = new Frustum();

/**
 * Class Tile, inherit of TransformNode
 */
export class Tile extends TransformNode {
	private static _downloadThreads = 0;

	/**
	 * Number of download threads.
	 */
	public static get downloadThreads() {
		return Tile._downloadThreads;
	}

	/** Coordinate of tile */
	public readonly x: number;
	public readonly y: number;
	public readonly z: number;

	/** Is a tile? */
	public readonly isTile = true;

	/** Mesh of the tile */
	private _mesh: Mesh | null = null;
	
	/** Materials of the tile */
	private _materials: Material[] = [];

	/** Observable events */
	public onTileDispose = new Observable<Tile>();
	public onTileReady = new Observable<Tile>();
	public onTileCreated = new Observable<Tile>();
	public onTileLoaded = new Observable<Tile>();

	private _showing = false;

	public get receiveShadows(): boolean {
		return this._mesh?.receiveShadows || false;
	}

	public set receiveShadows(value: boolean) {
		if (this._mesh) {
			this._mesh.receiveShadows = value;
		}
	}

	/**
	 * Gets the showing state of the tile.
	 */
	public get showing() {
		return this._showing;
	}

	/**
	 * Sets the showing state of the tile.
	 */
	public set showing(value: boolean) {
		this._showing = value;
		if (this._mesh) {
			this._mesh.setEnabled(value);
		}
	}

	private _ready = false;

	/** Max height of tile */
	private _maxZ = 0;

	public get maxZ() {
		return this._maxZ;
	}

	protected set maxZ(value) {
		this._maxZ = value;
	}

	/** Distance to camera */
	public distToCamera = 0;

	/** Tile size in world */
	public sizeInWorld = 0;

	private _loaded = false;

	public get loaded() {
		return this._loaded;
	}

	private _inFrustum = false;

	public get inFrustum() {
		return this._inFrustum;
	}

	protected set inFrustum(value) {
		this._inFrustum = value;
	}

	public get children(): Tile[] {
		return this.getChildren() as Tile[];
	}

	public get isLeaf(): boolean {
		return this.getChildren().filter(child => (child as Tile).isTile).length === 0;
	}

	/**
	 * Constructor
	 */
	constructor(x = 0, y = 0, z = 0, name?: string, scene?: Scene) {
		super(name || `Tile ${z}-${x}-${y}`, scene);
		this.x = x;
		this.y = y;
		this.z = z;
		// this.upVector = Vector3.Up();
	}

	/**
	 * Traverse the tile hierarchy
	 */
	public traverse(callback: (tile: Tile) => void): void {
		callback(this);
		this.getChildren().forEach(tile => {
			if (tile instanceof Tile) {
				tile.traverse(callback);
			}
		});
	}

	/**
	 * Traverse visible tiles
	 */
	public traverseVisible(callback: (tile: Tile) => void): void {
		if (this.isEnabled()) {
			callback(this);
			this.getChildren().forEach(tile => {
				if (tile instanceof Tile) {
					tile.traverseVisible(callback);
				}
			});
		}
	}

	/**
	 * LOD implementation
	 */
	protected LOD(
		loader: ITileLoader,
		minLevel: number,
		maxLevel: number,
		threshold: number,
		onCreate: (tile: Tile) => void,
		onLoad: (tile: Tile) => void,
	) {
		const action = LODEvaluate(this, minLevel, maxLevel, threshold);
		if (Tile.downloadThreads < THREADSNUM && action === LODAction.create) {
			const newTiles = createChildren(loader, this.x, this.y, this.z);
			newTiles.forEach(tile => {
				this.addChild(tile);
			});
			
			newTiles.forEach(newTile => {
				onCreate(newTile);
				if (newTile.z >= minLevel) {
					newTile._load(loader).then(onLoad);
				} else {
					onLoad(newTile);
				}
			});
		} else if (action === LODAction.remove) {
			this.showing = true;
			this.dispose(false);
		}
		return this;
	}

	/**
	 * Load tile data
	 */
	private async _load(loader: ITileLoader): Promise<Tile> {
		return new Promise<Tile>((resolve) => {
			Tile._downloadThreads++;
			const { x, y, z } = this;
			loader.load({ x, y, z, bounds: [-Infinity, -Infinity, Infinity, Infinity] }).then((meshData) => {
				Tile._downloadThreads--;
				
				if (this._mesh) {
					this._mesh.dispose();
				}
				
				this._mesh = meshData.geometry as Mesh;
				this._materials = meshData.materials;
				this._mesh.parent = this;
				
				resolve(this);
			});
		});
	}

	/**
	 * Update tile
	 */
	public update(params: TileUpdateParames) {
		if (!this.parent) {
			return this;
		}

		const camera = params.camera;
		const planes = Frustum.GetPlanes(camera.getProjectionMatrix().multiply(camera.getViewMatrix()));
		
		const cameraPosition = camera.position;

		this.traverse((tile) => {
			if (tile._mesh) {
				tile._mesh.receiveShadows = this._mesh?.receiveShadows || false;
			}

			// const worldMatrix = tile.getWorldMatrix();
			const bounds = new BoundingBox(tileBox.minimumWorld, tileBox.maximumWorld);
			tile.inFrustum = planes.some(plane => plane.dotCoordinate(bounds.centerWorld) >= 0);

			tile.distToCamera = getDistance(tile, cameraPosition);

			tile.LOD(
				params.loader,
				params.minLevel,
				params.maxLevel,
				params.LODThreshold,
				this._onTileCreate.bind(this),
				this._onTileLoad.bind(this)
			);
		});

		this._checkReady(params.minLevel);
		return this;
	}

	private _checkReady(minLevel: number) {
		if (!this._ready) {
			this._ready = true;
			this.traverse((child) => {
				if (child.isLeaf && child.loaded && child.z >= minLevel) {
					this._ready = false;
					return;
				}
			});
			if (this._ready) {
				this.onTileReady.notifyObservers(this);
			}
		}
		return this;
	}

	private _onLoad() {
		this._loaded = true;
		this._checkVisible();
		if (this._mesh) {
			this.maxZ = this._mesh.getBoundingInfo().boundingBox.maximumWorld.z;
		}
	}

	private _checkVisible() {
		const parent = this.parent as Tile;
		if (parent && parent.isTile) {
			const children = parent.children.filter(child => child.isTile);
			const allLoaded = children.every(child => child.loaded);
			parent.showing = !allLoaded;
			children.forEach(child => child.showing = allLoaded);
		}
	}

	private _onTileCreate(newTile: Tile) {
		newTile.computeWorldMatrix(true);
		newTile.sizeInWorld = getTileSize(newTile);
		this.onTileCreated.notifyObservers(newTile);
	}

	private _onTileLoad(newTile: Tile) {
		newTile._onLoad();
		this.onTileLoaded.notifyObservers(newTile);
	}

	public reload() {
		this.dispose(true);
		return this;
	}

	public dispose(disposeSelf: boolean) {
		if (disposeSelf && this.isTile && this.loaded) {
			this._materials.forEach(mat => mat.dispose());
			this._materials = [];
			if (this._mesh) {
				this._mesh.dispose();
				this._mesh = null;
			}
			this.onTileDispose.notifyObservers(this);
		}
		
		this.getChildren().forEach(child => {
			if (child instanceof Tile) {
				child.dispose(true);
			}
		});
		
		if (disposeSelf) {
			super.dispose();
		}
		
		return this;
	}
}
