// Component dung chung (H1): toast, alert, popup xac nhan, trang thai rong, loading
const UI = (() => {
  function vung(id, taoMoi) {
    let el = document.getElementById(id);
    if (!el) {
      el = taoMoi();
      document.body.appendChild(el);
    }
    return el;
  }

  // Thong bao nho goc phai, tu tat. loai: 'thanh-cong' | 'loi' | ''
  function toast(noiDung, loai = '', thoiGian = 3500) {
    const khung = vung('vung-toast', () => {
      const d = document.createElement('div');
      d.id = 'vung-toast';
      d.setAttribute('role', 'status');
      d.setAttribute('aria-live', 'polite');
      return d;
    });
    const t = document.createElement('div');
    t.className = `toast ${loai}`;
    t.textContent = noiDung;
    khung.appendChild(t);
    setTimeout(() => t.remove(), thoiGian);
  }

  // Popup chung: tra ve Promise<boolean> (true = bam nut chinh)
  function popup({ tieuDe, noiDung, nutChinh = 'OK', nutPhu = null, nguyHiem = false }) {
    return new Promise((resolve) => {
      const dlg = document.createElement('dialog');
      dlg.className = 'popup';
      dlg.setAttribute('aria-labelledby', 'popup-tieu-de');
      dlg.innerHTML = `
        <h2 id="popup-tieu-de"></h2>
        <p></p>
        <div class="hang-nut">
          ${nutPhu ? '<button type="button" class="btn" data-kq="0"></button>' : ''}
          <button type="button" class="btn ${nguyHiem ? 'btn-nguy-hiem' : 'btn-chinh'}" data-kq="1"></button>
        </div>`;
      dlg.querySelector('h2').textContent = tieuDe;
      dlg.querySelector('p').textContent = noiDung;
      dlg.querySelector('[data-kq="1"]').textContent = nutChinh;
      if (nutPhu) dlg.querySelector('[data-kq="0"]').textContent = nutPhu;

      const dong = (kq) => { dlg.close(); dlg.remove(); resolve(kq); };
      dlg.addEventListener('click', (e) => {
        const nut = e.target.closest('[data-kq]');
        if (nut) dong(nut.dataset.kq === '1');
      });
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); dong(false); }); // phim Esc
      document.body.appendChild(dlg);
      dlg.showModal();
    });
  }

  // Loi he thong (5xx): hop thong bao phai bam OK
  function alert(noiDung, tieuDe = 'Có lỗi xảy ra') {
    return popup({ tieuDe, noiDung });
  }

  // Hoi lai truoc thao tac quan trong (huy mon, thanh toan...)
  function xacNhan(noiDung, { tieuDe = 'Xác nhận', nutChinh = 'Đồng ý', nutPhu = 'Quay lại', nguyHiem = false } = {}) {
    return popup({ tieuDe, noiDung, nutChinh, nutPhu, nguyHiem });
  }

  // Hien "khong co du lieu" trong 1 vung
  function trangThaiRong(khung, noiDung) {
    khung.innerHTML = `
      <div class="rong">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16l-1.5 12h-13zM9 7V5h6v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
        <p></p>
      </div>`;
    khung.querySelector('p').textContent = noiDung;
  }

  // Dem so request dang chay; > 0 thi hien thanh loading
  let soDangTai = 0;
  function batLoading() {
    vung('thanh-tai', () => {
      const d = document.createElement('div');
      d.id = 'thanh-tai';
      d.setAttribute('aria-hidden', 'true');
      return d;
    });
    soDangTai += 1;
    document.body.classList.add('dang-tai');
  }
  function tatLoading() {
    soDangTai = Math.max(0, soDangTai - 1);
    if (soDangTai === 0) document.body.classList.remove('dang-tai');
  }

  // Dinh dang tien VND: 90000 -> "90.000đ"
  function tien(soTien) {
    return `${Number(soTien || 0).toLocaleString('vi-VN')}đ`;
  }

  // Phat am thanh thong bao nhe nhang (chime: 2 tong cho bep; ting: 1 tong cho thu ngan)
  let audioCtx = null;
  function amThanh(kieu = 'chime') {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;

      if (kieu === 'ting') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      } else {
        [523.25, 783.99].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const startTime = now + idx * 0.12;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.5);
        });
      }
    } catch (e) {
      // Bo qua neu trinh duyet chan
    }
  }

  return { toast, alert, xacNhan, trangThaiRong, batLoading, tatLoading, tien, amThanh };
})();
