import { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import pluginStealth from "puppeteer-extra-plugin-stealth";
import { default as request } from "request-promise-native";
import jwtDecode from "jwt-decode";

import { MotionData, RequestForm, CaptchaResponse } from "./requests";
import { Task } from "./types";

const userAgents = JSON.parse(require("fs").readFileSync(`./useragents.json`));
import { rnd, tensor, mm } from "./utils";

// Instantiate Version
let version: string;

// PluginStealth for any puppeteer instances
puppeteer.use(pluginStealth());

/**
 * @description Dynamically get HSL function for returning value needed to solve
 * @param req
 * @returns string HSL response
 */
const getHSL = async (req: string): Promise<string> => {
    version = (jwtDecode(req) as any)["l"].slice(
        "https://newassets.hcaptcha.com/c/".length
    );
    const hsl = await request.get(`${(jwtDecode(req) as any)["l"]}/hsl.js`);

    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        headless: true,
        args: [
            `--window-size=1300,570`,
            "--window-position=000,000",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            '--user-data-dir="/tmp/chromium"',
            "--disable-web-security",
            "--disable-features=site-per-process",
        ],
    });

    // Get browser pages
    const [page] = await browser.pages();
    await page.addScriptTag({
        content: hsl,
    });

    const response: string = await page.evaluate(`hsl("${req}")`);
    await browser.close();

    return response;
};

/**
 * @description Dynamically get HSW function for returning value needed to solve
 * @param req
 * @returns string HSW response
 */
const getHSW = async (req: string): Promise<string> => {
    version = (jwtDecode(req) as any)["l"].slice(
        "https://newassets.hcaptcha.com/c/".length
    );
    const hsw = await request.get(`${(jwtDecode(req) as any)["l"]}/hsw.js`);

    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        headless: true,
        args: [
            `--window-size=1300,570`,
            "--window-position=000,000",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            '--user-data-dir="/tmp/chromium"',
            "--disable-web-security",
            "--disable-features=site-per-process",
        ],
    });

    // Get browser pages
    const [page] = await browser.pages();
    await page.addScriptTag({
        content: hsw,
    });

    const response: string = await page.evaluate(`hsw("${req}")`);
    await browser.close();

    return response;
};

/**
 * @description Use tensforflow image recognition to determine correct answers
 * @param request_image
 * @param tasks
 * @returns map with answers
 */
const getAnswersTF = async (
    request_image: string,
    tasks: Task[]
): Promise<Map<string, boolean> | null> => {
    const answers: Map<string, boolean> = new Map<string, boolean>();
    const threads: any = [];

    for (const task of tasks) {
        threads.push(tensor(task.datapoint_uri));
    }

    try {
        await Promise.all(threads).then((results) => {
            results.forEach((res, index) => {
                let [data]: any = res;

                if (
                    data !== undefined &&
                    data.class.toUpperCase() === request_image.toUpperCase() &&
                    data.score > 0.5
                ) {
                    // @ts-expect-error
                    answers[tasks[index].task_key] = "true";
                } else {
                    // @ts-expect-error
                    answers[tasks[index].task_key] = "false";
                }
            });
        });
    } catch (err) {
        console.error(err);
        return null;
    }
    return answers;
};

/**
 * @description Main solve function that attempts to solve captcha
 * @param userAgent
 * @param sitekey
 * @param host
 * @returns string response token
 */
const tryToSolve = async (
    userAgent: string,
    sitekey: string,
    host: string
): Promise<string | null> => {
    // Create headers
    let headers: any = {
        Authority: "hcaptcha.com",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://newassets.hcaptcha.com",
        "Sec-Fetch-Site": "same-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        "User-Agent": userAgent,
    };

    // Check site config
    let response: any = await request({
        method: "get",
        headers,
        json: true,
        url: `https://hcaptcha.com/checksiteconfig?host=${host}&sitekey=${sitekey}&sc=1&swa=1`,
    });

    let timestamp: number = Date.now() + rnd(30, 120);

    // Check for HSJ
    if (response.c !== undefined && response.c.type === "hsj") {
        console.error("Wrong Challenge Type. Retrying.");
        return null;
    }

    // Instantiate form
    let form: RequestForm;

    // Setup form for getting tasks list
    if (response.c === undefined) {
        form = new RequestForm(
            sitekey,
            host,
            "en",
            new MotionData(timestamp, mm()).stringify()
        );
    } else {
        form = new RequestForm(
            sitekey,
            host,
            "en",
            new MotionData(timestamp, mm(), timestamp).stringify(),
            response.c.type === "hsl"
                ? await getHSL(response.c.req)
                : await getHSW(response.c.req),
            version,
            JSON.stringify(response.c)
        );
    }

    // Get tasks
    let getTasks: any = await request({
        method: "post",
        headers,
        json: true,
        url: `https://hcaptcha.com/getcaptcha?s=${sitekey}`,
        form: form,
    });

    if (getTasks.generated_pass_UUID) {
        return getTasks.generated_pass_UUID;
    }

    // Find what the captcha is looking for user's to click
    const requestImageArray: any[] = getTasks.requester_question.en.split(" ");
    let request_image: string = requestImageArray[requestImageArray.length - 1];
    if (request_image === "motorbus") {
        request_image = "bus";
    } else {
        request_image = requestImageArray[requestImageArray.length - 1];
    }

    const key: string = getTasks.key;
    if (key.charAt(0) !== "E" && key.charAt(2) === "_") {
        return key;
    }

    const tasks: Task[] = getTasks.tasklist;
    const job: any = getTasks.request_type;
    timestamp = Date.now() + rnd(30, 120);

    // Get Answers
    const answers: Map<string, boolean> | null = await getAnswersTF(
        request_image,
        tasks
    );

    if (!answers) {
        console.error("Error getting answers");
        return null;
    }

    // Renew response
    response = await request({
        method: "get",
        headers,
        json: true,
        url: `https://hcaptcha.com/checksiteconfig?host=${host}&sitekey=${sitekey}&sc=1&swa=1`,
    });

    let captchaResponse: CaptchaResponse;

    // Setup data for checking answers
    if (response.c === undefined) {
        captchaResponse = new CaptchaResponse(
            job,
            answers,
            host,
            sitekey,
            new MotionData(timestamp, mm(), timestamp).stringify()
        );
    } else {
        captchaResponse = new CaptchaResponse(
            job,
            answers,
            host,
            sitekey,
            new MotionData(timestamp, mm(), timestamp).stringify(),
            response.c.type === "hsl"
                ? await getHSL(response.c.req)
                : await getHSW(response.c.req),
            version,
            JSON.stringify(response.c)
        );
    }

    // Set new headers
    headers = {
        Authority: "hcaptcha.com",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        Origin: "https://newassets.hcaptcha.com",
        "Sec-Fetch-Site": "same-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        "User-Agent": userAgent,
    };

    // Check answers
    const checkAnswers: any = await request(
        `https://hcaptcha.com/checkcaptcha/${key}?s=${sitekey}`,
        {
            method: "post",
            headers,
            json: true,
            body: captchaResponse,
        }
    );

    if (checkAnswers.generated_pass_UUID) {
        return checkAnswers.generated_pass_UUID;
    }

    console.error("Wrong Response. Retrying.");
    return null;
};

/**
 * @description Sets up userAgent and passes required information to tryToSolveFunction
 * @param siteKey
 * @param host
 * @returns string response token
 */
const solveCaptcha = async (
    sitekey: string,
    host: string
): Promise<string | undefined> => {
    try {
        while (true) {
            // Get random index for random user agent
            const randomIndex = Math.round(
                Math.random() * (userAgents.length - 1 - 0) + 0
            );

            // Attempt to solve hCaptcha
            const result = await tryToSolve(
                userAgents[randomIndex].useragent,
                sitekey,
                host
            );
            if (result && result !== null) {
                return result;
            }
        }
    } catch (e: any) {
        if (e.statusCode === 429) {
            // Reached rate limit, wait 30 sec
            console.log("Rate limited. Waiting 30 seconds.");
            await new Promise((r) => setTimeout(r, 30000));
        } else {
            throw e;
        }
    }
};

/**
 * @description Setup function for hCaptcha solver using puppeteer
 * @param page
 * @returns null
 */
export const hcaptcha = async (page: Page): Promise<void> => {
    // Expose the page to our solveCaptcha function so we can utilize it
    await page.exposeFunction("solveCaptcha", solveCaptcha);

    // Wait for iframe to load
    await page.waitForSelector('iframe[src*="newassets.hcaptcha.com"]');

    const token: string | undefined = await page.evaluate(async () => {
        // Get hcaptcha iframe so we can get the host value
        const iframesrc = (
            document.querySelector(
                'iframe[src*="newassets.hcaptcha.com"]'
            ) as HTMLIFrameElement
        ).src;
        const urlParams = new URLSearchParams(iframesrc);

        return await solveCaptcha(
            urlParams.get("sitekey")!,
            urlParams.get("host")!
        );
    });

    if (!token) {
        console.error("Error solving captcha");
        return;
    }

    await page.evaluate((token) => {
        (
            document.querySelector(
                '[name="h-captcha-response"]'
            ) as HTMLInputElement
        ).value = token;
    }, token);

    return;
};

/**
 * @description Setup function for hCaptcha solver without puppeteer
 * @param url URL for page containing hCaptcha
 * @returns string response token
 */
export const hcaptchaToken = async (
    url: string
): Promise<string | undefined | null> => {
    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        headless: true,
    });

    // Get browser pages
    const [page] = await browser.pages();
    await page.goto(url);
    await page.setDefaultNavigationTimeout(0);

    // Wait for iframe to load
    await page.waitForSelector('iframe[src*="newassets.hcaptcha.com"]');

    const captchaData: (string | null)[] = await page.evaluate(async () => {
        // Get hcaptcha iframe so we can get the host value
        const iframesrc = (
            document.querySelector(
                'iframe[src*="newassets.hcaptcha.com"]'
            ) as HTMLIFrameElement
        ).src;
        const urlParams = new URLSearchParams(iframesrc);

        return [urlParams.get("sitekey"), urlParams.get("host")];
    });

    await browser.close();

    if (!captchaData) {
        console.error("Failed getting hcaptcha iframe");
        return null;
    }

    // Solve Captcha
    return await solveCaptcha(captchaData[0]!, captchaData[1]!);
};
