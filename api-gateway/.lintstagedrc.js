module.exports = {
  '**/*.{js,ts}': (files) => {
    // Filter files only inside api-gateway
    const gatewayFiles = files.filter(f => f.startsWith('api-gateway/'));

    if (gatewayFiles.length === 0) return [];

    const fileList = gatewayFiles.map(f => `"${f}"`).join(' ');

    return [
      `tsc --project api-gateway/tsconfig.json --skipLibCheck --noEmit`,
      `npm --prefix api-gateway run lint:fix -- ${fileList}`,
      `npm --prefix api-gateway run format -- ${fileList}`,
    ];
  }
};