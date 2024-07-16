/**
 *@description: Root Tile Class
 *@author: Guojf
 *@date: 2023-04-05
 */

import { Box3, Camera, Frustum, MathUtils, Matrix4, PerspectiveCamera, Vector3 } from "three";
import { ITileLoader } from "../loader/ITileLoaders";
import { Tile } from "./Tile";

const tempMat4 = new Matrix4();
const tileBox = new Box3(new Vector3(-0.5, -0.5, 0), new Vector3(0.5, 0.5, 9));
const frustum = new Frustum();

/**
 * Root tile, inherit of Tile.
 * note: update() function is called on the scene update every frame it is rendered.
 */
export class RootTile extends Tile {
	private _treeReadyCount = 0;
	private _autoLoad = true;
	private _loader: ITileLoader;
	private _minLevel = 0;

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

	private _maxLevel = 19;
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
	 * Get whether allow tile data to update, default true.
	 */
	public get autoLoad(): boolean {
		return this._autoLoad;
	}

	/**
	 * Set whether allow tile data to update, default true.
	 * true: load data on the scene update every frame it is rendered.
	 * false: do not load data, only update tile true.
	 */
	public set autoLoad(value: boolean) {
		this._autoLoad = value;
	}

	private _vierwerBufferSize = 1.2;

	/**
	 * Get renderer cache size scale. (0.5-2.5，default: 0.6)
	 */
	public get viewerbufferSize() {
		return this._vierwerBufferSize;
	}
	/**
	 * Get renderer cache size. (0.5-2.5，default: 0.6)
	 */
	public set viewerbufferSize(value) {
		this._vierwerBufferSize = MathUtils.clamp(value, 1, 2);
	}

	/**
	 * Constructor
	 * @param loader tile data loader
	 * @param level tile level, default:0
	 * @param x tile X-coordinate, default:0
	 * @param y tile y-coordinate, default:0
	 */
	public constructor(loader: ITileLoader, level = 0, x = 0, y = 0) {
		super(level, x, y);
		this._loader = loader;
		this.matrixAutoUpdate = true;
		this.matrixWorldAutoUpdate = true;
	}

	/**
	 * Update tile tree and tile data. It needs called on the scene update every frame.
	 * @param camera
	 */
	public update(camera: Camera) {
		// update tile tree
		if (this._updateTileTree(camera)) {
			this._treeReadyCount = 0;
		} else {
			this._treeReadyCount++;
		}

		// update tile data when tile tree steady
		if (this.autoLoad && this._treeReadyCount > 20) {
			this._updateTileData();
		}
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
	 * Update tile tree use LOD
	 * @param camera  camera
	 * @returns  the tile tree has changed
	 */
	private _updateTileTree(camera: Camera) {
		let change = false;

		// Frustum enlarge for buffer
		const bufferCamera = camera.clone();
		if (bufferCamera instanceof PerspectiveCamera) {
			bufferCamera.fov *= this.viewerbufferSize;
			bufferCamera.updateProjectionMatrix();
		}
		// Get the frustum
		frustum.setFromProjectionMatrix(
			tempMat4.multiplyMatrices(bufferCamera.projectionMatrix, bufferCamera.matrixWorldInverse),
		);

		// LOD for tiles
		this.traverse((tile) => {
			if (tile.isTile) {
				// Is the tile in the frustum? has buffer
				tile.inFrustum = frustum.intersectsBox(tileBox.clone().applyMatrix4(tile.matrixWorld));

				// LOD, get new tiles
				const newTiles = tile._lod(camera, this.minLevel, this.maxLevel, this.LODThreshold, this.isWGS);

				newTiles.forEach((newTile) => {
					// Fire event on the tile created
					this.dispatchEvent({ type: "tile-created", tile: newTile });
				});

				if (newTiles.length > 0) {
					change = true;
				}
			}
		});

		return change;
	}

	/**
	 *  Update tileTree data
	 */
	private _updateTileData() {
		this.traverse((tile) => {
			if (tile.isTile) {
				// load tile data
				tile._load(this.loader).then(() => {
					if (tile.loadState === "loaded") {
						// update z of map in view
						this._updateVisibleHight();
						// fire event of the tile loaded
						this.dispatchEvent({ type: "tile-loaded", tile });
					}
				});
			}
		});

		return this;
	}

	/**
	 * Update height of tiles in view
	 */
	private _updateVisibleHight() {
		let sumZ = 0,
			count = 0;
		this.maxZ = 0;
		this.minZ = 9000;
		this.traverse((tile) => {
			if (tile.isTile && tile.isLeafInFrustum && tile.loadState === "loaded") {
				this.maxZ = Math.max(this.maxZ, tile.maxZ);
				this.minZ = Math.min(this.minZ, tile.minZ);
				sumZ += tile.avgZ;
				count++;
			}
		});
		if (count > 0) {
			this.avgZ = sumZ / count;
		}
	}
}
