const toastHost = new URLSearchParams(window.location.search).has("toast");

if (toastHost) {
  void import("./toasts/mount");
} else {
  void import("./boot");
}
