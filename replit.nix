{pkgs}: {
  deps = [
    pkgs.sqlite
    pkgs.pkg-config
    pkgs.gnumake
    pkgs.gcc
    pkgs.python3
  ];
}
