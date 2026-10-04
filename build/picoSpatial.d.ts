export type Subscription = {
    remove: () => void;
};
export type WindowProperties = {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    distanceM?: number;
    userResizable?: boolean;
};
export declare function setWindowContainerProperties(props: WindowProperties): Promise<boolean>;
export type GazePose = {
    position: {
        x: number;
        y: number;
        z: number;
    };
    direction: {
        x: number;
        y: number;
        z: number;
    };
    valid: boolean;
};
export declare function onGaze(cb: (g: GazePose) => void): Subscription;
export declare function getGazeSnapshot(): GazePose | null;
export type SceneMesh = {
    vertices: number[] | Float32Array;
    indices: number[] | Uint32Array;
    normals?: number[] | Float32Array;
};
export declare function getSceneMesh(): Promise<SceneMesh | null>;
export declare function onSceneMeshUpdate(cb: (m: SceneMesh) => void): Subscription;
export type FaceBlendShapes = Record<string, number>;
export declare function onFace(cb: (b: FaceBlendShapes) => void): Subscription;
export type BodyJoint = {
    name: string;
    position: [number, number, number];
    rotation: [number, number, number, number];
};
export declare function onBody(cb: (joints: BodyJoint[]) => void): Subscription;
export declare function requestFullSpace(): Promise<boolean>;
export type AnchorPose = {
    position: {
        x: number;
        y: number;
        z: number;
    };
    orientation: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
};
export type SpatialAnchor = {
    id: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    orientation: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
};
export declare function createAnchor(pose: AnchorPose): Promise<SpatialAnchor | null>;
//# sourceMappingURL=picoSpatial.d.ts.map