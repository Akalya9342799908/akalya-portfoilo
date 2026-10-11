(() => {
  /* ==========================================================================
     1. CINEMATIC SCROLL ANIMATION (240 Frames with Physics LERP)
     ========================================================================== */
  const TOTAL_FRAMES = 240;
  const LERP_EASE = 0.085; // Butter-smooth Apple-grade easing

  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const images = new Array(TOTAL_FRAMES);
  let targetProgress = 0;
  let currentProgress = 0;
  let lastRenderedIndex = -1;
  let lastRenderedWasExact = false;
  let isLoopRunning = false;

  // Frame path generator: frames/ezgif-frame-001.jpg -> frames/ezgif-frame-240.jpg
  function getFramePath(index) {
    const frameNumber = String(index + 1).padStart(3, '0');
    return `frames/ezgif-frame-${frameNumber}.jpg`;
  }

  // High-DPI canvas resizing
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    const newPixelWidth = Math.round(width * dpr);
    const newPixelHeight = Math.round(height * dpr);

    if (canvas.width !== newPixelWidth || canvas.height !== newPixelHeight) {
      canvas.width = newPixelWidth;
      canvas.height = newPixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Redraw current frame
      lastRenderedIndex = -1;
      lastRenderedWasExact = false;
      renderFrame(getCurrentFrameIndex());
    }
  }

  function getCurrentFrameIndex() {
    return Math.min(
      TOTAL_FRAMES - 1,
      Math.max(0, Math.round(currentProgress * (TOTAL_FRAMES - 1)))
    );
  }

  // Exact frame or closest fallback
  function getRenderableImage(targetIndex) {
    const directImg = images[targetIndex];
    if (directImg && directImg.complete && directImg.naturalWidth > 0) {
      return { img: directImg, isExact: true };
    }

    // Search backwards
    for (let i = targetIndex - 1; i >= 0; i--) {
      if (images[i] && images[i].complete && images[i].naturalWidth > 0) {
        return { img: images[i], isExact: false };
      }
    }

    // Search forwards
    for (let i = targetIndex + 1; i < TOTAL_FRAMES; i++) {
      if (images[i] && images[i].complete && images[i].naturalWidth > 0) {
        return { img: images[i], isExact: false };
      }
    }

    return null;
  }

  // Draw frame on canvas with edge-to-edge cover aspect ratio
  function renderFrame(index) {
    if (index === lastRenderedIndex && lastRenderedWasExact) {
      return;
    }

    const result = getRenderableImage(index);
    if (!result) return;

    const { img, isExact } = result;
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    if (!imgW || !imgH) return;

    const scale = Math.max(canvasW / imgW, canvasH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (canvasW - drawW) / 2;
    const drawY = (canvasH - drawH) / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    lastRenderedIndex = index;
    lastRenderedWasExact = isExact;
  }

  // Calculate normalized scroll progress [0.0 - 1.0] across page
  function updateScrollProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) {
      targetProgress = 0;
    } else {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      targetProgress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
    }
  }

  // Main RAF tick loop with LERP smoothing
  function tick() {
    updateScrollProgress();

    const diff = targetProgress - currentProgress;
    if (Math.abs(diff) > 0.00005) {
      currentProgress += diff * LERP_EASE;
    } else {
      currentProgress = targetProgress;
    }

    const frameIndex = getCurrentFrameIndex();
    renderFrame(frameIndex);

    requestAnimationFrame(tick);
  }

  // Preload all 240 frames
  function preloadFrames() {
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);

      if ('decode' in img) {
        img.decode().catch(() => {});
      }

      const onImageReady = () => {
        const currentTarget = getCurrentFrameIndex();
        if (currentTarget === i || (i === 0 && lastRenderedIndex === -1)) {
          renderFrame(i);
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        onImageReady();
      } else {
        img.onload = onImageReady;
      }

      images[i] = img;
    }
  }

  /* ==========================================================================
     2. NAVIGATION & INTERACTIVE UI
     ========================================================================== */
  function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (navToggle && navMenu) {
      navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
      });
    }

    // Close menu when clicking link & handle active link scroll
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (navMenu && navMenu.classList.contains('open')) {
          navMenu.classList.remove('open');
        }
      });
    });

    // Active link highlighting on scroll
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener(
      'scroll',
      () => {
        const scrollY = window.pageYOffset + 250;
        sections.forEach((current) => {
          const sectionHeight = current.offsetHeight;
          const sectionTop = current.offsetTop;
          const sectionId = current.getAttribute('id');
          const correspondingLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

          if (correspondingLink) {
            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
              correspondingLink.classList.add('active');
            } else {
              correspondingLink.classList.remove('active');
            }
          }
        });
      },
      { passive: true }
    );
  }

  /* ==========================================================================
     3. RESUME MODAL & PRINT/DOWNLOAD
     ========================================================================== */
  function initResumeModal() {
    const modal = document.getElementById('resume-modal');
    const openBtn = document.getElementById('btn-open-resume-modal');
    const closeBtn = document.getElementById('btn-close-resume-modal');
    const closeActionBtn = document.getElementById('btn-modal-close-action');
    const printBtn = document.getElementById('btn-modal-print');
    const downloadBtn = document.getElementById('btn-download-resume');

    function openModal() {
      if (modal) {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    }

    function closeModal() {
      if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeActionBtn) closeActionBtn.addEventListener('click', closeModal);

    // Backdrop click close
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }

    // Escape key close
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
        closeModal();
      }
    });

    // Trigger Print / PDF
    function triggerPrint() {
      window.print();
    }

    if (printBtn) printBtn.addEventListener('click', triggerPrint);
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        openModal();
        setTimeout(triggerPrint, 350);
      });
    }
  }

  /* ==========================================================================
     4. INITIALIZE APP
     ========================================================================== */
  function init() {
    resizeCanvas();
    preloadFrames();
    updateScrollProgress();
    currentProgress = targetProgress;

    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    initNavigation();
    initResumeModal();

    if (!isLoopRunning) {
      isLoopRunning = true;
      requestAnimationFrame(tick);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
