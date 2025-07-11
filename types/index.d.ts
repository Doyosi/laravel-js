// TypeScript definitions for @doyosijs/laravel

export interface AjaxDivBoxOptions {
    url: string;
    container: string | HTMLElement;
    templateId?: string;
    metaKey?: string;
    dataKey?: string;
    fetcher?: 'axios' | 'fetch';
    onBox?: ((data: any) => string) | null;
    pagination?: string | HTMLElement | null;
    filterSelector?: string | HTMLElement | null;
    nothingFoundBlock?: string;
    errorBlock?: string;
    errorText?: string;
    loadingList?: string;
    additionalParams?: (() => Record<string, any>) | null;
}

export declare class AjaxDivBox {
    constructor(options: AjaxDivBoxOptions);
    on(event: string, callback: (payload: any) => void): this;
    init(page?: number): Promise<void>;
    fetchData(page?: number): Promise<void>;
    refresh(): void;
}

export interface AjaxTableOptions {
    url: string;
    container: string | HTMLElement;
    templateId?: string;
    metaKey?: string;
    dataKey?: string;
    fetcher?: 'axios' | 'fetch';
    onRow?: ((data: any) => string) | null;
    pagination?: string | HTMLElement | null;
    filterSelector?: string | HTMLElement | null;
}

export declare class AjaxTable {
    constructor(options: AjaxTableOptions);
    on(event: string, callback: (payload: any) => void): this;
    init(page?: number): Promise<void>;
    fetchData(page?: number): Promise<void>;
    refresh(): void;
}

export declare class CodeInput {
    constructor(selector: string, hiddenName: string);
}

export interface DeleteContentOptions {
    confirmText?: string;
    message?: string;
    successText?: string;
    successMessage?: string;
    errorText?: string;
    errorMessage?: string;
    successTimeout?: number | null;
    errorTimeout?: number | null;
    onDelete?: (success: boolean, data: any, button: HTMLElement) => void;
}

export declare class DeleteContent {
    constructor(selector: string | NodeList | HTMLElement[], options?: DeleteContentOptions);
}

export interface EditContentOptions {
    form: string | HTMLElement;
    editButtonSelector: string;
    cancelButtonSelector: string;
    submitButtonSelector?: string;
    addTitle?: string;
    editTitle?: string;
    addButtonText?: string;
    editButtonText?: string;
    onEditStart?: (data: any) => void;
    onEditEnd?: () => void;
}

export declare class EditContent {
    constructor(options: EditContentOptions);
    resetToAddMode(defaults?: Record<string, any>): void;
}

export interface FormSubmitOptions {
    method?: 'fetch' | 'axios' | 'xhr';
    httpMethod?: string;
    formSelector?: string | HTMLElement;
    submitButtonSelector?: string;
    action?: string;
    successMessage?: string;
    errorMessage?: string;
    successTitle?: string;
    errorTitle?: string;
    useToast?: boolean;
    disableOnSuccess?: boolean;
    redirectUrl?: string;
}

export declare class FormSubmit {
    constructor(config?: FormSubmitOptions);
    on(event: 'success' | 'error', callback: (payload: any) => void): this;
}

export declare class ImageInput {
    constructor(input: string | HTMLElement | NodeList);
    reset(fileInput: HTMLElement, img: HTMLElement, originalSrc: string): void;
}

export interface LanguageSwitchOptions {
    root?: HTMLElement | Document;
    localeDropdownSelector?: string;
    buttonSelector?: string;
    defaultLocale?: string;
}

export declare class LanguageSwitch {
    constructor(options?: LanguageSwitchOptions);
    switchLocale(locale: string): void;
}

export interface SelectDropdownOptions {
    onSelect?: (selection: {label: string, value: string}, element: HTMLElement) => void;
    closeOnSelect?: boolean;
}

export declare class SelectDropdown {
    constructor(containerSelector: string | HTMLElement, config?: SelectDropdownOptions);
    selectValue(value: string): void;
}

export interface SelectMultipleDropdownOptions {
    onSelect?: (data: {selections: string[], added?: string, cleared?: boolean}, element: HTMLElement | null) => void;
    onRemove?: (data: {selections: string[], removed: string}, element: HTMLElement) => void;
    maxSelections?: number;
    closeOnSelect?: boolean;
}

export declare class SelectMultipleDropdown {
    constructor(containerSelector: string | HTMLElement, config?: SelectMultipleDropdownOptions);
    selectValues(values: string[]): void;
    getSelections(): string[];
    clearSelections(): void;
    disableOption(values: string | string[]): void;
    enableOption(values: string | string[]): void;
    isOptionDisabled(value: string): boolean;
    getDisabledOptions(): string[];
    clearDisabledOptions(): void;
}

export interface ToastOptions {
    message?: string;
    title?: string;
    type?: 'info' | 'success' | 'error' | 'warning';
    duration?: number;
    position?: 'top-left' | 'top-center' | 'top-center-full' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-center-full' | 'bottom-right';
    icon?: string;
}

export declare class Toast {
    constructor(options?: ToastOptions);
}

// Default export
declare const plugins: {
    AjaxDivBox: typeof AjaxDivBox;
    AjaxTable: typeof AjaxTable;
    CodeInput: typeof CodeInput;
    DeleteContent: typeof DeleteContent;
    EditContent: typeof EditContent;
    FormSubmit: typeof FormSubmit;
    ImageInput: typeof ImageInput;
    LanguageSwitch: typeof LanguageSwitch;
    SelectDropdown: typeof SelectDropdown;
    SelectMultipleDropdown: typeof SelectMultipleDropdown;
    Toast: typeof Toast;
};

export default plugins;
export const version: string;