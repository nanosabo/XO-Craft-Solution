export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
};

type Pending = ConfirmRequest & {
  resolve: (accepted: boolean) => void;
};

let show: ((request: Pending) => void) | null = null;
let open = false;
const queue: Pending[] = [];

const pump = () => {
  if (open || !show || queue.length === 0) return;

  open = true;
  show(queue.shift() as Pending);
};

export const finishConfirm = () => {
  open = false;
  pump();
};

export const subscribeConfirm = (next: ((request: Pending) => void) | null) => {
  show = next;
  pump();

  return () => {
    if (show === next) show = null;
  };
};

export const confirmDialog = (request: ConfirmRequest) =>
  new Promise<boolean>((resolve) => {
    queue.push({ ...request, resolve });
    pump();
  });
