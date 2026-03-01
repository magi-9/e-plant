import 'axios';

declare module 'axios' {
    export interface AxiosRequestConfig {
        _retry?: boolean;
        _skipAuthRefresh?: boolean;
    }

    export interface InternalAxiosRequestConfig {
        _retry?: boolean;
        _skipAuthRefresh?: boolean;
    }
}
