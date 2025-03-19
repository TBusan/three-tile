/**
 *@description: Tile Loader
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import { Mesh, Material, MeshBuilder } from "@babylonjs/core";
import { ISource } from "../source/index2";
import { ITileLoader, MeshDateType, TileLoadParamsType } from "./ITileLoaders2";
import { LoaderFactory } from "./LoaderFactory2";

/**
 * Tile loader
 */
export class TileLoader implements ITileLoader {
	private _imgSource: ISource[] = [];
	/** Get image source */
	public get imgSource(): ISource[] {
		return this._imgSource;
	}
	/** Set image source */
	public set imgSource(value: ISource[]) {
		this._imgSource = value;
	}

	private _demSource: ISource | undefined;
	/** Get DEM source */
	public get demSource(): ISource | undefined {
		return this._demSource;
	}
	/** Set DEM source */
	public set demSource(value: ISource | undefined) {
		this._demSource = value;
	}

	private _useWorker = true;
	/** Get use worker */
	public get useWorker() {
		return this._useWorker;
	}
	/** Set use worker */
	public set useWorker(value: boolean) {
		this._useWorker = value;
	}

	/** Loader manager */
	public manager = LoaderFactory.manager;

	/**
	 * Load getmetry and materail of tile from x, y and z coordinate.
	 *
	 * @param x x coordinate of tile
	 * @param y y coordinate of tile
	 * @param z z coordinate of tile
	 * @returns Promise<MeshDateType> tile data
	 */
	public async load(params: TileLoadParamsType): Promise<MeshDateType> {
		const { x, y, z, bounds } = params;
		const geometry = await this.loadGeometry(x, y, z, bounds);
		const materials = await this.loadMaterial(x, y, z, bounds);

		console.assert(materials && geometry);

		// 在Babylon.js中，我们需要为每个材质创建一个子网格
		if (materials.length > 0) {
			geometry.material = materials[0];
			// 如果有多个材质，需要克隆网格并应用不同的材质
			for (let i = 1; i < materials.length; i++) {
				const clonedMesh = geometry.clone(`tile_${x}_${y}_${z}_${i}`);
				clonedMesh.material = materials[i];
			}
		}

		return { materials, geometry };
	}

	/**
	 * Load geometry
	 * @param x x coordinate of tile
	 * @param y y coordinate of tile
	 * @param z z coordinate of tile
	 * @returns Mesh
	 */
	protected async loadGeometry(
		x: number,
		y: number,
		z: number,
		tileBounds: [number, number, number, number],
	): Promise<Mesh> {
		if (this.demSource && z >= this.demSource.minLevel && this._isBoundsInSource(this.demSource, tileBounds)) {
			const loader = LoaderFactory.getGeometryLoader(this.demSource);
			loader.useWorker = this.useWorker;
			return await loader.load({ source: this.demSource, x, y, z, bounds: tileBounds });
		} else {
			// 创建一个简单的平面作为默认几何体
			return MeshBuilder.CreateGround(`tile_${x}_${y}_${z}`, {
				width: 1,
				height: 1,
				subdivisions: 1
			});
		}
	}

	/**
	 * Load material
	 * @param x x coordinate of tile
	 * @param y y coordinate of tile
	 * @param z z coordinate of tile
	 * @returns Material[]
	 */
	protected async loadMaterial(
		x: number,
		y: number,
		z: number,
		bounds: [number, number, number, number],
	): Promise<Material[]> {
		// get source in viewer
		const sources = this.imgSource.filter(
			(source) => z >= source.minLevel && this._isBoundsInSource(source, bounds),
		);
		if (sources.length === 0) {
			return [];
		}

		const materials = sources.map(async (source) => {
			const loader = LoaderFactory.getMaterialLoader(source);
			loader.useWorker = this.useWorker;

			return await loader.load({ source, x, y, z, bounds });
		});
		return Promise.all(materials);
	}

	/**
	 * Check the tile is in the source bounds
	 * @returns true in the bounds,else false
	 */
	private _isBoundsInSource(source: ISource, bounds: [number, number, number, number]): boolean {
		const sourceBounds = source._projectionBounds;
		const inBounds = !(
			bounds[2] < sourceBounds[0] ||
			bounds[3] < sourceBounds[1] ||
			bounds[0] > sourceBounds[2] ||
			bounds[1] > sourceBounds[3]
		); //[minx, miny, maxx, maxy]
		return inBounds;
	}
}
