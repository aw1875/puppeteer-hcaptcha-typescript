import { Page } from "puppeteer";

export interface hCaptcha {
  getHSL: (req: string) => Promise<string>;
  getHSW: (req: string) => Promise<string>;
  getAnswersTF: (request_image: string, tasks: any[]) => Map<any, any>;
  createForm: (
    sitekey: any,
    host: any,
    hl: string,
    motionData: MotionData,
    n?: any,
    v?: any,
    c?: string
  ) => RequestForm;
  tryToSolve: (userAgent: string, sitekey: string, host: string) => string;
  solveCaptcha: (siteKey: string, host: string) => string;
  hcaptcha: (page: Page) => Promise<void>;
  hcaptchaToken: (url: string) => Promise<string>;
}

declare class MotionData {
  st: number;
  dct?: number;
  mm: any[];
}

interface Task {
  datapoint_uri: string;
  task_key: string;
}

interface Tasks extends Array<Task> {
  tasks: Task[];
}

interface RequestForm {
  sitekey: any;
  host: any;
  hl: string;
  motionData: {
    st: number;
    dct?: number;
    mm: any[];
  };
  n?: any;
  v?: any;
  c?: string;
}
