const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const progressBar = document.createElement('div')
progressBar.className = 'ed-scroll-progress'
progressBar.setAttribute('role', 'progressbar')
progressBar.setAttribute('aria-label', 'Page scroll progress')
progressBar.setAttribute('aria-valuemin', '0')
progressBar.setAttribute('aria-valuemax', '100')
document.body.append(progressBar)

let scrollFrame = 0
const updateScrollProgress = () => {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(() => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = scrollableHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollableHeight) * 100)) : 0
    progressBar.style.width = `${progress}%`
    progressBar.setAttribute('aria-valuenow', String(Math.round(progress)))
    scrollFrame = 0
  })
}

window.addEventListener('scroll', updateScrollProgress, { passive: true })
window.addEventListener('resize', updateScrollProgress, { passive: true })
updateScrollProgress()

let revealObserver
const observeReveal = (root) => {
  if (!root || root.nodeType !== Node.ELEMENT_NODE) return
  if (root.matches('[data-ed-reveal], .ed-progress')) revealObserver.observe(root)
  root.querySelectorAll('[data-ed-reveal], .ed-progress').forEach((element) => revealObserver.observe(element))
}

if ('IntersectionObserver' in window) {
  revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add(entry.target.matches('.ed-progress') ? 'is-filled' : 'is-visible')
      observer.unobserve(entry.target)
    })
  }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' })
  observeReveal(document.body)
} else {
  document.querySelectorAll('[data-ed-reveal]').forEach((element) => element.classList.add('is-visible'))
  document.querySelectorAll('.ed-progress').forEach((element) => element.classList.add('is-filled'))
}

const revealMutations = typeof MutationObserver === 'undefined' || !revealObserver
  ? null
  : new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach(observeReveal))
    })
revealMutations?.observe(document.body, { childList: true, subtree: true })

let preloaderTimer
let preloaderFrame
let preloader
if (!reducedMotion) {
  preloader = document.createElement('div')
  preloader.className = 'ed-preloader'
  preloader.setAttribute('aria-hidden', 'true')
  preloader.inert = true
  const counter = document.createElement('span')
  counter.className = 'ed-preloader-count'
  counter.textContent = '0'
  preloader.append(counter)
  document.body.append(preloader)

  const startedAt = performance.now()
  const animateCounter = (now) => {
    const progress = Math.min((now - startedAt) / 650, 1)
    counter.textContent = String(Math.round(progress * 100))
    if (progress < 1) {
      preloaderFrame = window.requestAnimationFrame(animateCounter)
    } else {
      preloaderTimer = window.setTimeout(() => {
        preloader.classList.add('is-complete')
        preloaderTimer = window.setTimeout(() => preloader.remove(), 260)
      }, 120)
    }
  }
  preloaderFrame = window.requestAnimationFrame(animateCounter)
} else {
  document.querySelectorAll('[data-ed-reveal]').forEach((element) => element.classList.add('is-visible'))
  document.querySelectorAll('.ed-progress').forEach((element) => element.classList.add('is-filled'))
}

window.addEventListener('pagehide', () => {
  window.removeEventListener('scroll', updateScrollProgress)
  window.removeEventListener('resize', updateScrollProgress)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
  if (preloaderFrame) window.cancelAnimationFrame(preloaderFrame)
  if (preloaderTimer) window.clearTimeout(preloaderTimer)
  revealObserver?.disconnect()
  revealMutations?.disconnect()
}, { once: true })
