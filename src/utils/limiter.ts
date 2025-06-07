export function createLimiter(concurrency: number) {
    const queue: (() => void)[] = [];
    let activeCount = 0;

    const next = () => {
        if (queue.length === 0 || activeCount >= concurrency) return;
        activeCount++;
        const run = queue.shift();
        if (run) run();
    };

    const runWithLimit = <T>(fn: () => Promise<T>): Promise<T> =>
        new Promise((resolve, reject) => {
            const task = () => {
                fn()
                    .then(resolve)
                    .catch(reject)
                    .finally(() => {
                        activeCount--;
                        next();
                    });
            };
            queue.push(task);
            next();
        });

    return runWithLimit;
}