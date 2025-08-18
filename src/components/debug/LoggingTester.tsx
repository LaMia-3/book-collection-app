import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import logger, { LogLevel, configureLogging, createLogger, resetLoggingConfig } from '@/utils/loggingUtils';

const log = createLogger('LoggingTester');

/**
 * A component to test and demonstrate the logging utility with different configurations
 */
export const LoggingTester: React.FC = () => {
  // Current logging configuration state
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.INFO);
  const [enableConsole, setEnableConsole] = useState<boolean>(true);
  const [prefix, setPrefix] = useState<string>('[BookApp]');
  const [enableTimestamp, setEnableTimestamp] = useState<boolean>(true);

  // Context for contextual logging
  const [context, setContext] = useState<string>('TestContext');
  const [contextualLogger, setContextualLogger] = useState(() => createLogger('TestContext'));

  // Update the contextual logger when context changes
  useEffect(() => {
    setContextualLogger(() => createLogger(context));
  }, [context]);

  // Apply configuration changes
  const applyConfig = () => {
    configureLogging({
      level: logLevel,
      enableConsole,
      prefix,
      enableTimestamp
    });
    console.log('Logging configuration updated:', { logLevel, enableConsole, prefix, enableTimestamp });
  };

  // Reset to default configuration
  const resetConfig = () => {
    resetLoggingConfig();
    const defaultConfig = logger.getConfig();
    setLogLevel(defaultConfig.level);
    setEnableConsole(defaultConfig.enableConsole);
    setPrefix(defaultConfig.prefix);
    setEnableTimestamp(defaultConfig.enableTimestamp);
    console.log('Logging configuration reset to defaults');
  };

  // Generate test logs with the global logger
  const generateGlobalLogs = () => {
    logger.error('This is an ERROR level message from global logger');
    logger.warn('This is a WARN level message from global logger');
    logger.info('This is an INFO level message from global logger');
    logger.debug('This is a DEBUG level message from global logger');
    logger.trace('This is a TRACE level message from global logger');
  };

  // Generate test logs with the contextual logger
  const generateContextualLogs = () => {
    log.error('This is an ERROR level message with component context');
    log.warn('This is a WARN level message with component context');
    log.info('This is an INFO level message with component context');
    log.debug('This is a DEBUG level message with component context');
    log.trace('This is a TRACE level message with component context');
  };

  // Generate test logs with the custom context logger
  const generateCustomContextLogs = () => {
    contextualLogger.error('This is an ERROR level message with custom context', { customData: 'test' });
    contextualLogger.warn('This is a WARN level message with custom context', { customData: 'test' });
    contextualLogger.info('This is an INFO level message with custom context', { customData: 'test' });
    contextualLogger.debug('This is a DEBUG level message with custom context', { customData: 'test' });
    contextualLogger.trace('This is a TRACE level message with custom context', { customData: 'test' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logging Configuration Tester</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Log Level */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="log-level">Log Level</Label>
              <Select
                value={logLevel.toString()}
                onValueChange={(value) => setLogLevel(parseInt(value))}
              >
                <SelectTrigger id="log-level" className="col-span-3">
                  <SelectValue placeholder="Select log level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LogLevel.NONE.toString()}>NONE</SelectItem>
                  <SelectItem value={LogLevel.ERROR.toString()}>ERROR</SelectItem>
                  <SelectItem value={LogLevel.WARN.toString()}>WARN</SelectItem>
                  <SelectItem value={LogLevel.INFO.toString()}>INFO</SelectItem>
                  <SelectItem value={LogLevel.DEBUG.toString()}>DEBUG</SelectItem>
                  <SelectItem value={LogLevel.TRACE.toString()}>TRACE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Enable Console */}
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-console"
                checked={enableConsole}
                onCheckedChange={setEnableConsole}
              />
              <Label htmlFor="enable-console">Enable Console Output</Label>
            </div>

            {/* Prefix */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="prefix">Log Prefix</Label>
              <Input
                id="prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="col-span-3"
              />
            </div>

            {/* Enable Timestamp */}
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-timestamp"
                checked={enableTimestamp}
                onCheckedChange={setEnableTimestamp}
              />
              <Label htmlFor="enable-timestamp">Enable Timestamp</Label>
            </div>

            {/* Custom Context */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="context">Custom Log Context</Label>
              <Input
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="col-span-3"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-2">
              <Button onClick={resetConfig} variant="outline">
                Reset to Default
              </Button>
              <Button onClick={applyConfig} variant="default">
                Apply Configuration
              </Button>
            </div>

            {/* Test Log Buttons */}
            <div className="pt-4 flex flex-wrap gap-2">
              <Button onClick={generateGlobalLogs} variant="outline">
                Test Global Logger
              </Button>
              <Button onClick={generateContextualLogs} variant="outline">
                Test Component Logger
              </Button>
              <Button onClick={generateCustomContextLogs} variant="outline">
                Test {context} Logger
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            Use this utility to test the logging system with different configurations:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Change the log level to see how different log messages are filtered</li>
            <li>Toggle console output on/off</li>
            <li>Modify the prefix that appears before all logs</li>
            <li>Toggle timestamps on/off</li>
            <li>Create custom contextual loggers with different names</li>
            <li>Open your browser's console to see the log output</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-4">
            Note: You'll need to open your browser's developer tools (F12 or Cmd+Opt+I) 
            to see the console output. Log level hierarchy: TRACE &gt; DEBUG &gt; INFO &gt; WARN &gt; ERROR &gt; NONE
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoggingTester;
