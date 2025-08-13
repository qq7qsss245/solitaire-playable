import fs from 'fs';
import path from 'path';

/**
 * Vite 插件：将配置文件嵌入到生产环境构建中
 */
export function configEmbedPlugin() {
  return {
    name: 'vite-plugin-config-embed',
    enforce: 'post',
    generateBundle(options, bundle) {
      // 只在生产环境中处理
      if (process.env.NODE_ENV !== 'production') {
        return;
      }

      for (const fileName in bundle) {
        const file = bundle[fileName];
        if (file.type === 'asset' && file.fileName.endsWith('.html')) {
          let html = file.source.toString();
          
          try {
            // 读取 output-config.json 文件
            const configPath = path.resolve(process.cwd(), 'src/config/output-config.json');
            if (fs.existsSync(configPath)) {
              const configContent = fs.readFileSync(configPath, 'utf8');
              const configData = JSON.parse(configContent);
              
              // 将配置编码为 base64
              const base64Config = Buffer.from(JSON.stringify(configData)).toString('base64');
              const encodedConfig = `application/octet-stream---${base64Config}`;
              
              // 创建嵌入脚本
              const embedScript = `
<script>
window.EMBEDDED_CONFIG = window.EMBEDDED_CONFIG || {};
window.EMBEDDED_CONFIG['output-config.json'] = '${encodedConfig}';
</script>`;
              
              // 将脚本插入到 head 标签中
              html = html.replace('</head>', `${embedScript}</head>`);
              
              console.log('✅ [config-embed-plugin] Successfully embedded output-config.json');
            } else {
              console.warn('⚠️ [config-embed-plugin] output-config.json not found at:', configPath);
            }
          } catch (error) {
            console.error('❌ [config-embed-plugin] Error embedding config:', error);
          }
          
          file.source = html;
        }
      }
    }
  };
}