import { ConsoleLogger, LogLevel } from '@nestjs/common'

// Nest names its levels `log` and `verbose`, which Loki does not recognise, so every
// normal line landed in Grafana's "unknown" bucket. Map them to standard level names.
const LEVEL_NAMES: Partial<Record<LogLevel, string>> = {
  log: 'info',
  verbose: 'trace',
}

/** Nest's JSON logger, with level names Loki/Grafana can detect. */
export class JsonConsoleLogger extends ConsoleLogger {
  protected getJsonLogObject(
    message: unknown,
    options: Parameters<ConsoleLogger['getJsonLogObject']>[1],
  ) {
    const logObject = super.getJsonLogObject(message, options)
    // The base signature types `level` as Nest's LogLevel, but the value is only serialised
    // to JSON, so a standard name outside that union is safe here.
    const level = (LEVEL_NAMES[options.logLevel] ?? options.logLevel) as LogLevel
    return { ...logObject, level }
  }
}
