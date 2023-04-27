export class Command {

    static Status = {
        NO: 'NO',
        STARTED: 'STARTED',
        COMPLETED: 'COMPLETED',
        INTERRUPTED: 'INTERRUPTED',
        FAILED: 'FAILED'
    }

    static toStatus() {
        return {
            status: Command.Status.NO,
            successes: 0,
            failures: 0,

            currentExecutionTime: undefined,
            lastExecutionTime: undefined
        }
    }

    static toPolicy(minSuccesses, maxFailures, successIntervalMsecs = 10000, failureIntervalMsecs = 2000) {
        return {
            minSuccesses: minSuccesses,
            maxFailures: maxFailures,

            successIntervalMsecs: successIntervalMsecs,
            failureIntervalMsecs: failureIntervalMsecs
        }
    }

    static toCallbacks(onNext, onError, onCompleted, onTimeoutId, onInterrupted) {
        return {
            onNext: onNext,
            onError: onError,
            onCompleted: onCompleted,
            onTimeoutId: onTimeoutId,
            onInterrupted: onInterrupted
        }
    }

    static toCommandConfig(command, callbacks, policy) {
        return {
            command: command,
            callbacks: callbacks,
            interrupt: false,
            policy: policy,
            status: Command.toStatus()
        }
    }

    static async runCommand(config) {
        return new Promise((resolve, reject) => {
            const {
                command,
                callbacks,
                interrupt,
                policy,
                status
            } = config

            const tryToExecute = async () => {

                if (interrupt === true) {
                    status.status = Command.Status.INTERRUPTED

                    callbacks.onInterrupted()
                    resolve()
                    return
                }

                let isSuccess = false

                try {
                    status.status = Command.Status.STARTED

                    const data = await command()
                    isSuccess = true

                    status.successes = status.successes + 1
                    callbacks.onNext(data)
                } catch (e) {
                    status.failures = status.failures + 1
                    callbacks.onError(e)
                }


                if (
                    policy.minSuccesses > status.successes &&
                    policy.maxFailures > status.failures
                ) {
                    // -------------------------------------------
                    // Execute command again if policy requires
                    // -------------------------------------------
                    const timeoutId = setTimeout(
                        async () => await tryToExecute(),
                        isSuccess
                            ? policy.successIntervalMsecs
                            : policy.failureIntervalMsecs
                    )

                    callbacks.onTimeoutId(timeoutId)
                }
                else if (
                    policy.maxFailures <= status.failures
                ) {
                    status.status = Command.Status.FAILED
                    callbacks.onError({error: 'Unable to do it'})

                    reject({error: 'Unable to do it'})
                }
                else {
                    status.status = Command.Status.COMPLETED
                    callbacks.onCompleted(status)

                    resolve()
                }
            }
            tryToExecute()
        })
    }
}
