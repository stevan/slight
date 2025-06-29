export type PipelineError = {
    type: 'ERROR';
    stage: string;
    message: string;
    details?: any;
};

export function isPipelineError(obj: any): obj is PipelineError {
    return obj && obj.type === 'ERROR';
}
