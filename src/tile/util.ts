/**
 *@description: Tile uitls
 *@author: Guojf
 *@date: 2023-04-05
 */

import { Vector3 } from "three";
import { Tile } from ".";
import { ITileLoader } from "../loader";

export enum LODAction {
	none,
	create,
	remove,
}

const FACTOR = 1.02;

// Get the distance of camera to tile
export function getDistance(tile: Tile, cameraWorldPosition: Vector3) {
	const tilePos = tile.position.clone().setZ(tile.avgZ).applyMatrix4(tile.matrixWorld);
	return cameraWorldPosition.distanceTo(tilePos);
}

export function getTileSize(tile: Tile) {
	const scale = tile.scale;
	const lt = new Vector3(-scale.x, -scale.y, 0).applyMatrix4(tile.matrixWorld);
	const rt = new Vector3(scale.x, scale.y, 0).applyMatrix4(tile.matrixWorld);
	return lt.sub(rt).length();
}

function getDistRatio(tile: Tile): number {
	return (tile.distToCamera / tile.sizeInWorld) * 0.8;
}

export function LODEvaluate(tile: Tile, minLevel: number, maxLevel: number, threshold: number): LODAction {
	if (tile.z > minLevel && tile.index === 0 && tile.parent?.isTile) {
		const dist = getDistRatio(tile.parent);
		if (tile.z > maxLevel || dist > threshold * FACTOR || !tile.parent.inFrustum) {
			return LODAction.remove;
		}
	}
	if (tile.z < maxLevel && tile.isLeaf && tile.inFrustum) {
		const dist = getDistRatio(tile);
		if (tile.z < minLevel || dist < threshold / FACTOR) {
			return LODAction.create;
		}
	}
	return LODAction.none;
}

/**
 * Load the children tile from coordinate
 *
 * @param px parent tile x coordinate
 * @param py parent tile y coordinate
 * @param pz parent tile level
 * @param minLevel min level to load
 * @param onLoad callback when one tile loaded
 * @returns children tile array
 */
export function loadChildren(
	loader: ITileLoader,
	px: number,
	py: number,
	pz: number,
	minLevel: number,
	onLoad: (tile: Tile) => void,
): Tile[] {
	const getTile = (x: number, y: number, level: number, minLevel: number) => {
		const tile: Tile = level < minLevel ? new Tile(x, y, level) : loader.load(x, y, level, () => onLoad(tile));
		return tile;
	};

	const children: Tile[] = [];

	const level = pz + 1;
	const x = px * 2;
	const z = 0;
	const pos = 0.25;
	// Two children at level 0 when 4326 projection
	const isWGS = loader.imgSource[0].projectionID === "4326";
	if (pz === 0 && isWGS) {
		const y = py;
		const scale = new Vector3(0.5, 1.0, 1.0);
		const t1 = getTile(x, y, level, minLevel);
		const t2 = getTile(x, y, level, minLevel);
		t1.position.set(-pos, 0, z);
		t1.scale.copy(scale);
		t2.position.set(pos, 0, z);
		t2.scale.copy(scale);
		children.push(t1, t2);
	} else {
		const y = py * 2;
		const scale = new Vector3(0.5, 0.5, 1.0);
		const t1 = getTile(x, y, level, minLevel);
		const t2 = getTile(x + 1, y, level, minLevel);
		const t3 = getTile(x, y + 1, level, minLevel);
		const t4 = getTile(x + 1, y + 1, level, minLevel);
		t1.position.set(-pos, pos, z);
		t1.scale.copy(scale);
		t2.position.set(pos, pos, z);
		t2.scale.copy(scale);
		t3.position.set(-pos, -pos, z);
		t3.scale.copy(scale);
		t4.position.set(pos, -pos, z);
		t4.scale.copy(scale);
		children.push(t1, t2, t3, t4);
	}
	return children;
}
