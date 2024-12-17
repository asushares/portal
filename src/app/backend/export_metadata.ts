// Author: Preston Lee

export class ExportMetadata {
    transactionTime: string = '';
    request: string = '';
    requiresAccessToken: boolean = false;
    output: Array<{
        type: string,
        url: string
    }> = [];
    error: [] = [];
}