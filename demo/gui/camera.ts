import { CameraHelper, Vector3 } from "three";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { Tween } from "three/examples/jsm/libs/tween.module.js";
import * as tt from "../../src";

export const createCameraGui = (gui: GUI, viewer: tt.plugin.GLViewer, map: tt.TileMap) => {
	/**
	 * 飞行到某世界坐标
	 * @param cameraPos 目标摄像机世界坐标
	 * @param centerPos 目标地图中心坐标
	 */
	const flyToPos = (cameraPos: Vector3, centerPos: Vector3) => {
		viewer.controls.target.copy(centerPos);
		const start = viewer.camera.position;
		new Tween(start)
			// 先到10000km高空
			.to({ y: 10000, z: 0 }, 500)
			// 再到目标位置
			.chain(new Tween(start).to(cameraPos, 2000))
			.start();
	};

	/**
	 * 飞行到某地理坐标
	 * @param newCameraGeo 目标摄像机经纬度坐标
	 * @param newcenterGeo 目标地图中心经纬度坐标
	 */
	const flyToGeo = (newCameraGeo: Vector3, newcenterGeo: Vector3) => {
		const cameraPosition = getPos(newCameraGeo);
		const centerPosition = getPos(newcenterGeo);
		flyToPos(cameraPosition, centerPosition);
	};

	const getGeo = (pos: Vector3) => {
		return map.world2geo(pos);
	};

	const getPos = (geo: Vector3) => {
		return map.geo2world(geo);
	};

	const vm = {
		restCamera: () => {
			flyToGeo(new Vector3(110, -10, 4000), new Vector3(110, 30, 0));
		},
		toBeiJing: () => {
			const g1 = new Vector3(116.39199596764485, 39.91047669278009, 0.8982447706283121);
			const g2 = new Vector3(116.39180280130437, 39.915285657622775, 0);
			flyToGeo(g1, g2);
		},
		toYanan: () => {
			const camera = new Vector3(109.48543504270644, 36.59146704194476, 1.6124168502501655);
			const center = new Vector3(109.49721492409648, 36.613511416979144, 2.587750541118096e-16);
			flyToGeo(camera, center);
		},
		toQomolangma: () => {
			const g1 = new Vector3(86.80606589682316, 27.95599784430085, 8.632029116020213);
			const g2 = new Vector3(86.94920793640907, 27.97634961375401, 0);
			flyToGeo(g1, g2);
		},
		toTaiBaiShan: () => {
			const g1 = new Vector3(107.81217986540818, 34.02513971165077, 6.048197106231797);
			const g2 = new Vector3(107.7612653393517, 33.98143120559124, 0);
			flyToGeo(g1, g2);
		},
		toHuaShan: () => {
			const g1 = new Vector3(110.0971156415985, 34.57775144132326, 5.7782429087774245);
			const g2 = new Vector3(110.06942930220872, 34.510265895992404, 0);
			flyToGeo(g1, g2);
		},
		toHuangShan: () => {
			const g1 = new Vector3(118.20015977025946, 30.06770300827729, 2.610548923662593);
			const g2 = new Vector3(118.18812519546589, 30.099295710163304, 0);
			flyToGeo(g1, g2);
		},
		toTaiShan: () => {
			const g1 = new Vector3(117.10289638118692, 36.19675384399952, 1.6517273521123468);
			const g2 = new Vector3(117.10207227084261, 36.220267343404004, 0);
			flyToGeo(g1, g2);
		},
		toUluru: () => {
			const g1 = new Vector3(131.01972109578136, -25.34644783404596, 1.0185954608775432);
			const g2 = new Vector3(131.03497059727212, -25.346617629956928, 0);
			flyToGeo(g1, g2);
		},
		toFuji: () => {
			const g1 = new Vector3(138.7168714361765, 35.293034242886165, 4.138178498736728);
			const g2 = new Vector3(138.73205716638114, 35.35132576846971, 0);
			flyToGeo(g1, g2);
		},
		toNewyork: () => {
			const g1 = new Vector3(-74.00824629593717, 40.697098959649566, 1.6554257243613275);
			const g2 = new Vector3(-74.007744759308, 40.70653413033989, 0);
			flyToGeo(g1, g2);
		},
		toHome: () => {
			const g1 = new Vector3(108.94232215761177, 34.2582357530813, 0.7844306648412458);
			const g2 = new Vector3(108.94250888147981, 34.26353272269615, 0);
			flyToGeo(g1, g2);
		},
		toSchool: () => {
			const camera = new Vector3(126.62167808106878, 45.736928355251315, 1.2842047462544324);
			const center = new Vector3(126.62613052944019, 45.740203546956955, 9.757703042909935e-16);
			flyToGeo(camera, center);
		},
		cameraInfoToConsole: () => {
			const cameraGeo = getGeo(viewer.camera.getWorldPosition(new Vector3()));
			const targetGeo = getGeo(viewer.controls.target);
			const code = `
()=>{
	const camera = new Vector3(${cameraGeo.x},${cameraGeo.y},${cameraGeo.z})
	const center = new Vector3(${targetGeo.x},${targetGeo.y},${targetGeo.z})
	flyToGeo(camera,center);
}
			`;
			navigator.clipboard.writeText(code);
			console.log("-----------------------------------------------------------------------------------------");
			console.log(code);
			console.log("-----------------------------------------------------------------------------------------");
			console.log("Code has copide to clipboard");
		},

		cameraHelper: () => {
			if (cameraHelper) {
				viewer.scene.remove(cameraHelper);
			}
			cameraHelper = new CameraHelper(viewer.camera.clone());
			viewer.scene.add(cameraHelper);
		},
	};

	let cameraHelper: CameraHelper;

	const folder = gui.addFolder("Camera position");

	folder.add(vm, "restCamera").name("Reset");
	folder.add(vm, "cameraHelper");
	folder.add(vm, "cameraInfoToConsole");
	folder.add(vm, "toHome");
	folder.add(vm, "toSchool");
	folder.add(vm, "toBeiJing");
	folder.add(vm, "toYanan");
	folder.add(vm, "toQomolangma");
	folder.add(vm, "toTaiBaiShan");
	folder.add(vm, "toHuaShan");
	folder.add(vm, "toHuangShan");
	folder.add(vm, "toTaiShan");
	folder.add(vm, "toFuji");
	folder.add(vm, "toUluru");
	folder.add(vm, "toNewyork");
};
