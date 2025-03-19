/**
 *@description: Map function
 *@author: 郭江峰
 *@date: 2024-04-08
 */

 import { 
    Vector3,  
    Camera, 
    Ray, 
    PickingInfo, 
    DynamicTexture,
    StandardMaterial,
    MeshBuilder,
    TransformNode
} from "@babylonjs/core";
import { Tile } from "../tile/index2";
import { TileMap } from "./TileMap2";
import { GLViewer } from "../plugin/index2";

/**
 * ground location info type
 */
export interface LocationInfo extends PickingInfo {
    location: Vector3;
}

/**
 * get ground info from a ray
 * @param map
 * @param ray
 * @returns intersect info or undefined(not intersect)
 */
export function getLocalInfoFromRay(map: TileMap, ray: Ray): LocationInfo | undefined {
    const pickInfo = map.scene.pickWithRay(ray, (mesh) => mesh instanceof Tile);
    if (pickInfo?.hit && pickInfo.pickedMesh instanceof Tile) {
        const point = pickInfo.pickedPoint?.clone();
        if (point) {
            const worldMatrix = map.getWorldMatrix();
            const localPoint = Vector3.TransformCoordinates(point, worldMatrix.invert());
            const lonlat = map.pos2geo(localPoint);
            return Object.assign(pickInfo, {
                location: lonlat
            }) as LocationInfo;
        }
    }
    return undefined;
}

/**
 * get ground info from world coordinate
 * @param worldPosition world coordinate
 * @returns ground info
 */
export function getLocalInfoFromWorld(map: TileMap, worldPosition: Vector3) {
    const downVec3 = new Vector3(0, -1, 0);
    // 原点（高空10km）
    const origin = new Vector3(worldPosition.x, 10, worldPosition.z);
    // 从原点垂直地面向下做一条射线
    const ray = new Ray(origin, downVec3);
    return getLocalInfoFromRay(map, ray);
}

/**
 * get ground info from screen coordinate
 * @param camera
 * @param pointer screen coordinate（-1~1）
 * @returns ground info
 */
export function getLocalInfoFromScreen(camera: Camera, map: TileMap, pointer: Vector3) {
    const ray = camera.getForwardRay(pointer.x, pointer.y);
    return getLocalInfoFromRay(map, ray);
}

export function attachEvent(map: TileMap) {
    const loadingManager = map.loader.manager;

    const dispatchLoadingEvent = (type: string, payload?: any) => {
        const event = new CustomEvent(type, { detail: payload });
        map.onEvent.notifyObservers(event);
    };

    // 添加瓦片加载事件
    loadingManager.onStartTask = (taskName: string, loaded: number, total: number) => {
        dispatchLoadingEvent("loading-start", { url: taskName, itemsLoaded: loaded, itemsTotal: total });
    };

    loadingManager.onTaskError = (taskName: string) => {
        dispatchLoadingEvent("loading-error", { url: taskName });
    };

    loadingManager.onTaskComplete = () => {
        dispatchLoadingEvent("loading-complete");
    };

    loadingManager.onProgress = (taskName: string, loaded: number, total: number) => {
        dispatchLoadingEvent("loading-progress", { url: taskName, itemsLoaded: loaded, itemsTotal: total });
    };

    // 地图准备就绪事件
    map.rootTile.onTileReady.add(() => dispatchLoadingEvent("ready"));

    // 瓦片创建完成事件
    map.rootTile.onTileCreated.add((tile) => {
        dispatchLoadingEvent("tile-created", { tile });
    });

    // 瓦片加载完成事件
    map.rootTile.onTileLoaded.add((tile) => {
        dispatchLoadingEvent("tile-loaded", { tile });
    });
}

export function getAttributions(tileMap: TileMap) {
    const attributions: string[] = [];
    const imgSources = Array.isArray(tileMap.imgSource) ? tileMap.imgSource : [tileMap.imgSource];
    imgSources.forEach((source) => {
        const attr = source.attribution;
        attr && attributions.push(attr);
    });
    if (tileMap.demSource) {
        const attr = tileMap.demSource.attribution;
        attr && attributions.push(attr);
    }
    return [...new Set(attributions)];
}

export function goHome(map: TileMap, viewer: GLViewer) {
    // 按下 F1 键事件
    window.addEventListener("keydown", (event) => {
        if (event.key === "F1") {
            event.preventDefault();
            if (!map.getTransformNodeByName("boards")) {
                const boards = createBillboards("three-tile");
                boards.name = "boards";
                boards.parent = map;

                map.onEvent.add((evt) => {
                    if (evt.type === "loading-complete") {
                        const lonlat = new Vector3(108.94236, 34.2855, 0);
                        const info = map.getLocalInfoFromGeo(lonlat);
                        if (info) {
                            boards.setEnabled(true);
                            const pos = map.geo2map(info.location);
                            boards.position = pos;
                        }
                    }
                });
            }
            const lonlat = new Vector3(108.94236, 34.2855, 0);
            const centerPosition = map.geo2world(lonlat);
            const cameraPosition = centerPosition.clone().add(new Vector3(-1, 2, 0));
            viewer.flyTo(centerPosition, cameraPosition);
        }
    });
}

export function drawBillboards(txt: string, size: number = 128) {
    const texture = new DynamicTexture("billboardTexture", size, undefined, true);
    const ctx = texture.getContext();

    ctx.fillStyle = "#000022";
    ctx.strokeStyle = "DarkGoldenrod";

    // Draw vertical line
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(size / 2, 3);
    ctx.lineTo(size / 2, size);
    ctx.stroke();

    // Draw rounded rectangle
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(2, 2, size - 4, size / 2 - 8, 10);
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.font = "24px Arial";
    ctx.fillStyle = "Goldenrod";
    ctx.strokeStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.strokeText(txt, size / 2, 20);
    ctx.fillText(txt, size / 2, 20);

    texture.update();
    return texture;
}

export function createBillboards(txt: string, size = 128) {
    const texture = drawBillboards(txt, size);
    const material = new StandardMaterial("boardMaterial", undefined);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;

    const board = MeshBuilder.CreatePlane("board", { size: 1 }, undefined);
    board.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    board.isVisible = false;
    board.scaling.setAll(0.11);
    board.material = material;
    
    return board;
}