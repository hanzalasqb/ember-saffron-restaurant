import { demoApi } from "../demo";
import { httpApi } from "./api";

export const api = import.meta.env.VITE_DEMO === "true" ? demoApi : httpApi;
export { token } from "./api";
