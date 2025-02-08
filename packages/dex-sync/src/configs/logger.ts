export const logger = (label: string, loglevel?: string): any => {
  return {
    info: (text: string) =>
      console.info(`${new Date().toLocaleString()} [INFO] [${label}]: ${text}`),
    error: (text: string, error: Error) => {
      console.error(`${new Date().toLocaleString()} [ERROR] [${label}]: ${text}, ${error}`);
    },
  };
};
