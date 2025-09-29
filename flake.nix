{
  description = "Flake for bun project with aarch64 and linux targets";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-darwin" ];
    in
    {
      devShell = builtins.listToAttrs (map
        (system: {
          name = system;
          value =
            let
              pkgs = import nixpkgs { system = system; };
            in
            pkgs.mkShell {
              buildInputs = with pkgs; [
                gcc.cc.lib
                nodejs_20
                python27Full
                bun
              ];
              shellHook = ''
                export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib.outPath}/lib:$LD_LIBRARY_PATH"
              '';
            };

        })
        systems);
    };
}
