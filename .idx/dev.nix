{ pkgs, ... }: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
    pkgs.supabase-cli
  ];
  idx.extensions = [
    "dbaeumer.vscode-eslint"
  ];
  idx.previews = {
    enable = true;
    previews = {
      web = {
        # Executa o Vite diretamente para evitar problemas de detecção com o npm
        command = [ "node_modules/.bin/vite" ];
        manager = "web";
      };
    };
  };
}
