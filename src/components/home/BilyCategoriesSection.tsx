import Link from 'next/link'
import {
  AppWindow,
  BadgeDollarSign,
  Gamepad2,
  Gem,
  MonitorPlay,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react'

const categories = [
  { label: '\u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a', href: '/products', icon: AppWindow },
  { label: '\u0627\u0644\u0623\u0644\u0639\u0627\u0628', href: '/products', icon: Gamepad2 },
  { label: '\u0627\u0644\u0645\u062d\u0627\u0641\u0638', href: '/wallet', icon: Wallet },
  { label: '\u0627\u0644\u0631\u0635\u064a\u062f', href: '/wallet', icon: BadgeDollarSign },
  { label: '\u0627\u0644\u0633\u0648\u0634\u064a\u0627\u0644 \u0645\u064a\u062f\u064a\u0627', href: '/categories', icon: MonitorPlay },
  { label: '\u0627\u0644\u062a\u0631\u0641\u064a\u0647', href: '/categories', icon: Sparkles },
  { label: '\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0648\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a', href: '/categories', icon: ShieldCheck },
  { label: '\u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a', href: '/categories', icon: ShoppingBag },
  { label: '\u0627\u0644\u0623\u0643\u062b\u0631 \u0645\u0628\u064a\u0639\u0627\u064b', href: '/products', icon: Gem, highlighted: true },
]

export default function BilyCategoriesSection() {
  return (
    <section className='rounded-[24px] border border-violet-300/20 bg-[linear-gradient(180deg,rgba(8,12,24,.96),rgba(6,10,20,.98))] p-2.5 shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_18px_38px_rgba(2,6,23,0.45)] sm:p-3'>
      <div className='mb-2.5 flex items-center justify-between border-b border-violet-300/20 pb-2.5'>
        <h2 className='text-lg font-black text-white sm:text-xl'>{'\u0627\u0644\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0633\u0631\u064a\u0639\u0629'}</h2>
        <span className='text-xs text-slate-400 sm:text-sm'>{'\u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u0648\u0635\u0648\u0644'}</span>
      </div>

      <div className='flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible'>
        {categories.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group shrink-0 rounded-xl border px-2 py-2 text-center transition duration-200 hover:-translate-y-0.5 sm:min-w-[132px] ${
                item.highlighted
                  ? 'border-violet-300/40 bg-[linear-gradient(180deg,rgba(90,47,180,.24),rgba(31,20,58,.95))] shadow-[0_0_26px_rgba(139,92,246,0.3)] hover:border-cyan-300/45'
                  : 'border-violet-300/20 bg-[linear-gradient(180deg,rgba(20,27,48,.88),rgba(10,15,30,.96))] hover:border-cyan-300/35 hover:bg-[linear-gradient(180deg,rgba(27,35,60,.94),rgba(12,18,34,.98))]'
              }`}
            >
              <span
                className={`mx-auto mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                  item.highlighted
                    ? 'border-violet-200/45 bg-violet-500/24 text-violet-100 shadow-[0_0_18px_rgba(139,92,246,0.35)]'
                    : 'border-cyan-300/30 bg-cyan-500/12 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.18)] group-hover:border-cyan-200/45'
                }`}
              >
                <Icon className='h-4 w-4' />
              </span>
              <div className='whitespace-nowrap text-[12px] font-bold text-slate-100 sm:text-[13px]'>{item.label}</div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
