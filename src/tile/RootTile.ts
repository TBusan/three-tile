/**
 *@description: Root Tile Class
 *@author: Guojf
 *@date: 2023-04-05
 */

import { Box3, Camera, Frustum, Matrix4, Vector3 } from "three";
import { ITileLoader } from "../loader/ITileLoaders";
import { Tile } from "./Tile";
import { LODAction, LODEvaluate } from "./LODEvaluate";
import { creatChildrenTile } from "./tileCreator";

// export interface RootTileEventMap extends TileEventMap {
// 	tileCreated: { type: "tile-created" };
// 	tileLoadError: { type: "tile-load-error" };
// 	tileLoaded: { type: "tile-loaded" };
// }

// export interface RootTileEventMap {
// 	ready: { type: "reay" };
// }

const tempVec3 = new Vector3();
const tempMat4 = new Matrix4();
const tileBox = new Box3(new Vector3(-0.5, -0.5, 0), new Vector3(0.5, 0.5, 9));
const frustum = new Frustum();

/**
 * Root tile, inherit of Tile
 */
export class RootTile extends Tile {
	private _loader: ITileLoader;
	private _minLevel = 0;
	private _maxLevel = 19;
	private _ready = false;

	/**
	 * Get minLevel of the map
	 */
	public get minLevel() {
		return this._minLevel;
	}
	/**
	 * Set minLevel of the map,
	 */
	public set minLevel(value) {
		this._minLevel = value;
	}

	/**
	 * Get maxLevel of the map
	 */
	public get maxLevel() {
		return this._maxLevel;
	}
	/**
	 * Set  maxLevel of the map
	 */
	public set maxLevel(value) {
		this._maxLevel = value;
	}

	private _LODThreshold = 1;
	/**
	 * Get LOD threshold
	 */
	public get LODThreshold() {
		return this._LODThreshold;
	}
	/**
	 * Set LOD threshold
	 */
	public set LODThreshold(value) {
		this._LODThreshold = value;
	}

	/**
	 * Is the map WGS projection
	 */
	public isWGS = false;

	/**
	 * Get tile loader
	 */
	public get loader(): ITileLoader {
		return this._loader;
	}
	/**
	 * Set tile loader
	 */
	public set loader(value: ITileLoader) {
		this._loader = value;
	}

	/**
	 * Constructor
	 * @param loader tile data loader
	 * @param z tile level, default:0
	 * @param x tile X-coordinate, default:0
	 * @param y tile y-coordinate, default:0
	 */
	public constructor(loader: ITileLoader, z = 0, x = 0, y = 0) {
		super(z, x, y);
		this.showing = true;
		this._loader = loader;
		this.matrixAutoUpdate = true;
		this.matrixWorldAutoUpdate = true;
	}

	/**
	 * Update tile tree and tile data. It called on the scene update every frame.
	 * @param camera
	 *
	 * @returns this
	 */
	public update(camera: Camera) {
		this._tileTreeUpdate(camera);
		this._checkReady();
		return this;
	}

	/**
	 * Reload data, Called to take effect after source has changed
	 */
	public reload() {
		this.dispose(true);
		return this;
	}

	/**
	 * Check the map is ready to render
	 *
	 * @returns this
	 */
	private _checkReady() {
		if (!this._ready) {
			this._ready = true;
			this.traverse((child) => {
				if (child.isLeaf && child.loadState != "loaded" && child.coord.z >= this.minLevel) {
					this._ready = false;
				}
			});
			if (this._ready) {
				this.dispatchEvent({ type: "ready" });
			}
		}
		return this;
	}

	/**
	 * Update tile tree use LOD
	 * @param camera  camera
	 *
	 * @returns this
	 */
	private _tileTreeUpdate(camera: Camera) {
		frustum.setFromProjectionMatrix(tempMat4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
		const cameraWorldPosition = camera.getWorldPosition(tempVec3);

		// LOD for tiles
		this.traverse((tile) => {
			const bounds = tileBox.clone().applyMatrix4(tile.matrixWorld);
			tile.inFrustum = frustum.intersectsBox(bounds);

			// LOD to get new tiles and tiles to remove
			// const { newTiles, oldTiles } = tile._LOD(
			// 	cameraWorldPosition,
			// 	this.minLevel,
			// 	this.maxLevel,
			// 	this.LODThreshold,
			// 	this.isWGS,
			// );
			const { newTiles, oldTiles } = this.LOD(tile, cameraWorldPosition);
			// Dispose old tiles
			if (oldTiles) {
				oldTiles.dispose(false);
			}

			// Load data for new tiles
			this._dataUpdate(newTiles);
		});
		return this;
	}

	/**
	 *  Get distance of the tile center to camera
	 */
	private _getDistToCamera(tile: Tile, cameraPosition: Vector3) {
		const tilePos = tile.position.clone().setZ(tile.avgZ).applyMatrix4(tile.matrixWorld);
		return cameraPosition.distanceTo(tilePos);
	}

	private LOD(tile: Tile, cameraWorldPosition: Vector3) {
		let newTiles: Tile[] = [];
		let oldTiles: Tile | null = null;
		tile.distToCamera = this._getDistToCamera(tile, cameraWorldPosition);
		// LOD evaluate
		const action = LODEvaluate(tile, this.minLevel, this.maxLevel, this.LODThreshold);
		if (action === LODAction.create && tile.showing) {
			newTiles = creatChildrenTile(tile, this.isWGS);
			newTiles.forEach((child) => (child.distToCamera = this._getDistToCamera(child, cameraWorldPosition)));
		} else if (action === LODAction.remove) {
			const parent = tile.parent;
			if (parent?.isTile && !parent.showing) {
				oldTiles = parent;
				parent.showing = true;
			}
		}
		return { newTiles, oldTiles };
	}

	/**
	 * Load data
	 *
	 * @param tiles Tiles needs load
	 * @returns this
	 */
	private _dataUpdate(tiles: Tile[]) {
		const sortedTiles = tiles.sort((a, b) => a.distToCamera - b.distToCamera);
		sortedTiles.forEach((tile) => {
			this.dispatchEvent({ type: "tile-created", tile });
			tile.load(this.loader, this.minLevel, this.maxLevel).then((loaded) => {
				if (loaded) {
					if (tiles.every((child) => child.loadState === "loaded")) {
						this._calcHeightInView();
					}
					tile.dispatchEvent({ type: "tile-loaded", tile });
				}
			});
		});
		return this;
	}

	/**
	 * Calculate the elevation of tiles in view
	 *
	 * @returns this
	 */
	private _calcHeightInView() {
		let sumZ = 0,
			count = 0;
		this.maxZ = 0;
		this.minZ = 9000;
		this.traverse((child) => {
			if (child.isLeaf && child.inFrustum && child.loadState === "loaded") {
				this.maxZ = Math.max(this.maxZ, child.maxZ);
				this.minZ = Math.min(this.minZ, child.minZ);
				sumZ += child.avgZ;
				count++;
			}
		});
		if (count > 0) {
			this.avgZ = sumZ / count;
		}
		return this;
	}
}
