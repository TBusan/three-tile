/**
 *@description: Utils for loader
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import { Vector2 } from "@babylonjs/core";
import { ISource } from "../source/index2";

/**
 * Get bounds to clip image
 * @param clipBounds bounds [minx,miny,maxx,maxy],0-1
 * @param targetSize size to scale
 * @returns startX,StarY,width,height
 */
export function getBoundsCoord(clipBounds: [number, number, number, number], targetSize: number) {
	// left-top coordinate
	const sx = Math.floor(clipBounds[0] * targetSize);
	const sy = Math.floor(clipBounds[1] * targetSize);
	// width and height of the clipped image
	const sw = Math.floor((clipBounds[2] - clipBounds[0]) * targetSize);
	const sh = Math.floor((clipBounds[3] - clipBounds[1]) * targetSize);
	return { sx, sy, sw, sh };
}

/**
 * Get url and rect for max level tile
 * to load greater than max level from source,  had to load from max level.
 * 因为瓦片数据并未覆盖所有级别瓦片，如MapBox地形瓦片最高只到15级，如果要显示18级以上瓦片，不能从17级瓦片中获取，只能从15级瓦片里截取一部分
 * @param source
 * @param tile
 * @returns max tile url and bounds in  in maxTile
 */
export function getSafeTileUrlAndBounds(
	source: ISource,
	x: number,
	y: number,
	z: number,
): {
	url: string | undefined;
	clipBounds: [number, number, number, number];
} {
	// 请求数据级别<最小级别返回空
	if (z < source.minLevel) {
		return {
			url: undefined,
			clipBounds: [0, 0, 1, 1],
		};
	}
	// 请数据级别<最大级别返回图片uil已经全部图片范围
	if (z <= source.maxLevel) {
		const url = source._getUrl(x, y, z);
		const clipBounds: [number, number, number, number] = [0, 0, 1, 1];
		return {
			url,
			clipBounds,
		};
	}

	// 取出数据源最大级别瓦片和当前瓦片在最大瓦片中的位置
	const maxLevelTileAndBox = getMaxLevelTileAndBounds(x, y, z, source.maxLevel);
	const pxyz = maxLevelTileAndBox.parentNO;
	const url = source._getUrl(pxyz.x, pxyz.y, pxyz.z);

	return { url, clipBounds: maxLevelTileAndBox.bounds };
}

function getMaxLevelTileAndBounds(x: number, y: number, z: number, maxLevel: number) {
	const dl = z - maxLevel;
	const parentNO = { x: x >> dl, y: y >> dl, z: z - dl };
	const sep = Math.pow(2, dl);
	const size = Math.pow(0.5, dl);
	const xx = (x % sep) / sep - 0.5 + size / 2;
	const yy = (y % sep) / sep - 0.5 + size / 2;
	const parentCenter = new Vector2(xx, yy);

	// 创建包围盒
	const halfSize = size / 2;
	const minX = parentCenter.x - halfSize + 0.5;
	const minY = parentCenter.y - halfSize + 0.5;
	const maxX = parentCenter.x + halfSize + 0.5;
	const maxY = parentCenter.y + halfSize + 0.5;

	const bounds: [number, number, number, number] = [
		minX,
		minY,
		maxX,
		maxY
	];

	return { parentNO, bounds };
}
