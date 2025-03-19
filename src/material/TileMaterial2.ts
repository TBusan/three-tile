/**
 *@description: Tile marterila
 *@author: 郭江峰
 *@date: 2023-04-05
 */

import { StandardMaterial, Texture, Scene } from "@babylonjs/core";

/**
 * Tile material
 */
export class TileMaterial2 extends StandardMaterial {
    constructor(name: string, scene: Scene) {
        super(name, scene);
        this.transparencyMode = 2; // ALPHATEST mode
        this.backFaceCulling = true;
        this.roughness = 0.3;
        this.specularPower = 0.8;
        // this.metallicTexture = null;
    }

    public setTexture(texture: Texture) {
        this.diffuseTexture = texture;
        this.markAsDirty(StandardMaterial.TextureDirtyFlag);
    }

    public dispose(): void {
        const texture = this.diffuseTexture;
        if (texture) {
            if ((texture._texture as any)?.url instanceof ImageBitmap) {
                (texture._texture as any).url.close();
            }
            texture.dispose();
        }
        super.dispose();
    }
}
