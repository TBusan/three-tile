import { Box2, BufferGeometry, MathUtils, PlaneGeometry } from "three";

import {
	FileLoaderEx,
	ITileGeometryLoader,
	LoaderFactory,
	getSafeTileUrlAndBounds,
	rect2ImageBounds,
} from "../../loader";

import { GeometryInfo, TileGeometry } from "../../geometry";
import { ISource } from "../../source";
import * as Lerc from "./lercDecode/LercDecode.es";
import { parse } from "./parse";
import ParseWorker from "./parse.worker?worker&inline";

const emptyGeometry = new BufferGeometry();
/**
 * ArcGis-lerc格式瓦片几何体加载器
 * @link https://github.com/Esri/lerc
 */
export class TileGeometryLercLoader implements ITileGeometryLoader {
	public readonly dataType = "lerc";
	private _useWorker = true;
	/** get use worker */
	public get useWorker() {
		return this._useWorker;
	}
	/** set use worker */
	public set useWorker(value: boolean) {
		this._useWorker = value;
	}
	// 图像加载器
	private fileLoader = new FileLoaderEx(LoaderFactory.manager);

	public constructor() {
		this.fileLoader.setResponseType("arraybuffer");
	}

	// 加载瓦片几何体
	public load(source: ISource, x: number, y: number, z: number, onLoad: () => void, abortSignal: AbortSignal) {
		if (!Lerc.isLoaded()) {
			Lerc.load({
				locateFile: (wasmFileName?: string | undefined, _scriptDir?: string | undefined) => `./${wasmFileName}`,
			});
		}
		// 瓦片级别<8，不需要显示地形
		if (z < 8) {
			setTimeout(onLoad);
			return new PlaneGeometry();
		}
		// 计算最大级别瓦片和本瓦片在其中的位置
		const { url, bounds } = getSafeTileUrlAndBounds(source, x, y, z);

		// 没有url，返回默认几何体
		if (!url) {
			setTimeout(onLoad);
			return emptyGeometry;
		}
		// 计算瓦片图片大小（像素）
		let tileSize = (z + 2) * 3;
		tileSize = MathUtils.clamp(tileSize, 2, 48);

		return this._load(url, tileSize, bounds, onLoad, abortSignal);
	}

	private async decode(buffer: ArrayBuffer) {
		if (!Lerc.isLoaded()) {
			await Lerc.load({
				locateFile: (wasmFileName?: string | undefined, _scriptDir?: string | undefined) => `./${wasmFileName}`,
			});
		}

		const pixelBlock = Lerc.decode(buffer);
		const { height, width, pixels } = pixelBlock;
		const dem = new Float32Array(height * width);
		for (let i = 0; i < dem.length; i++) {
			dem[i] = pixels[0][i] / 1000;
		}
		return { width, height, dem };
	}

	// private _load(tile: Tile, url: any, rect: Box2, onLoad: () => void) {
	private _load(url: string, tileSize: number, bounds: Box2, onLoad: () => void, abortSignal: AbortSignal) {
		const geometry = new TileGeometry();

		this.fileLoader.load(
			url,
			// onLoad
			(buffer) => {
				this.decode(buffer).then((value: { dem: Float32Array; width: number }) => {
					// 计算剪裁区域
					const piexlRect = rect2ImageBounds(bounds, value.width);
					// 剪裁一部分，缩放到size大小
					const data = clipAndResize(
						value.dem,
						value.width,
						piexlRect.sx,
						piexlRect.sy,
						piexlRect.sw,
						piexlRect.sh,
						tileSize,
						tileSize,
					);

					// 是否使用worker解析
					if (this.useWorker) {
						const worker = new ParseWorker();
						worker.onmessage = (e: MessageEvent<GeometryInfo>) => {
							geometry.setData(e.data);
							onLoad();
						};
						worker.postMessage({ buffer: data, height: tileSize, width: tileSize });
					} else {
						parse(data, tileSize, tileSize).then((geoInfo) => {
							geometry.setData(geoInfo);
							onLoad();
						});
					}
				});
			},
			undefined, // onProgress
			onLoad, // onError
			abortSignal,
		);
		return geometry;
	}
}

// 数组剪裁并缩放
function clipAndResize(
	buffer: Float32Array,
	bufferWidth: number,
	sx: number,
	sy: number,
	sw: number,
	sh: number,
	dw: number,
	dh: number,
) {
	// clip
	const cdata = new Float32Array(sw * sh);
	for (let i = 0; i < sh; i++) {
		for (let j = 0; j < sw; j++) {
			const sourceIndex = (i + sy) * bufferWidth + (j + sx);
			const destIndex = i * sw + j;
			cdata[destIndex] = buffer[sourceIndex];
		}
	}
	if (sw <= dw || sh <= dh) {
		return cdata;
	}

	// resize
	const sdata = new Float32Array(dh * dw);
	for (let i = 0; i < dw; i++) {
		for (let j = 0; j < dh; j++) {
			const destIndex = i * dh + j;
			const sourceX = Math.floor((j * sh) / dh);
			const sourceY = Math.floor((i * sw) / dw);
			const sourceIndex = sourceY * sw + sourceX;
			sdata[destIndex] = cdata[sourceIndex];
		}
	}

	return sdata;
}
