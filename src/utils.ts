import { path } from "ghost-cursor";
import * as tf from "@tensorflow/tfjs-node";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import fetch from "node-fetch";

/**
 * @description Randomize Function
 * @param start optional
 * @param end optional
 * @returns Random int between start and end time
 */
export const rnd = (start: number = 3000, end: number = 5000): number => {
    return Math.round(Math.random() * (end - start) + start);
};

/**
 * @description Tensforflow Image Recognition Function
 * @param {*} imgURL
 * @returns Predictions array
 */
export const tensor = async (imageURL: string): Promise<any | null> => {
    try {
        const blob = await fetch(imageURL)
            .then((res) => res.buffer())
            .catch((err) => console.log(err));

        // Load the model
        const model = await cocoSsd.load();

        // Classify the image
        //@ts-expect-error
        const predictions = await model.detect(tf.node.decodeImage(blob));

        return predictions;
    } catch {
        return null;
    }
};

/**
 * @description Generate mouse movements
 * @returns Mouse Movements array
 */
export const mm = (): any[] => {
    const from = { x: 100, y: 100 };
    const to = { x: 600, y: 700 };

    const route = path(from, to);

    const mm: any = [];
    route.forEach((i: any) => {
        mm.push([i.x, i.y, i.timestamp]);
    });

    return mm;
};
