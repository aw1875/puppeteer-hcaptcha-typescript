export class MotionData {
    st: number;
    mm: any[];
    dct?: number;

    constructor(st: number, mm: any[], dct?: number) {
        this.st = st;
        this.mm = mm;
        this.dct = dct;
    }

    stringify(): string {
        return JSON.stringify(this);
    }
}

export class RequestForm {
    sitekey: string;
    host: string;
    hl: string;
    motionData: string;
    n?: any;
    v?: any;
    c?: string;

    constructor(
        sitekey: string,
        host: string,
        hl: string,
        motionData: string,
        n?: any,
        v?: any,
        c?: string
    ) {
        this.sitekey = sitekey;
        this.host = host;
        this.hl = hl;
        this.motionData = motionData;
        this.n = n;
        this.v = v;
        this.c = c;
    }
}

export class CaptchaResponse {
    job_mode: any;
    answers: Map<string, boolean>;
    serverdomain: string;
    sitekey: string;
    motionData: string;
    n?: any = null;
    v?: any;
    c?: string = "null";

    constructor(
        job_mode: any,
        answers: Map<string, boolean>,
        serverdomain: string,
        sitekey: string,
        motionData: string,
        n?: any,
        v?: any,
        c?: string
    ) {
        this.job_mode = job_mode;
        this.answers = answers;
        this.serverdomain = serverdomain;
        this.sitekey = sitekey;
        this.motionData = motionData;
        this.n = n;
        this.v = v;
        this.c = c;
    }
}
