import { useState } from 'react';
import { Modal, Button } from '../components/ui';

/**
 * Promise-based confirmation dialog.
 *
 * const { confirm, dialog } = useConfirm();
 * ...
 * <button onClick={() => confirm({ title: 'Delete?', message: '...' }).then((ok) => ok && remove())} />
 * {dialog}
 */
export function useConfirm() {
  const [opts, setOpts] = useState(null);

  function confirm(options) {
    return new Promise((resolve) => {
      setOpts({ ...options, resolve });
    });
  }

  function close(value) {
    if (opts && opts.resolve) opts.resolve(value);
    setOpts(null);
  }

  const dialog = opts ? (
    <Modal
      open
      onClose={() => close(false)}
      title={opts.title || 'Are you sure?'}
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)}>
            {opts.cancelLabel || 'Cancel'}
          </Button>
          <Button variant={opts.danger === false ? 'primary' : 'danger'} onClick={() => close(true)}>
            {opts.confirmLabel || 'Confirm'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{opts.message}</p>
      {opts.detail && <p className="mt-2 text-xs text-slate-400">{opts.detail}</p>}
    </Modal>
  ) : null;

  return { confirm, dialog };
}

export default useConfirm;
