import React from 'react'

export default function Privacy() {
  return (
    <main className="container-x py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-black text-white sm:text-3xl">سياسة الخصوصية</h1>
        <p className="mt-2 text-sm text-white/50">آخر تحديث: 27 أغسطس 2026</p>

        <div className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-white/70 sm:p-8 sm:text-[15px]">
          <section>
            <h2 className="text-base font-bold text-white">1. البيانات التي نجمعها</h2>
            <ul className="mt-2 list-disc space-y-1 pr-5">
              <li>بيانات الحساب: الاسم، رقم الموبايل، وكلمة المرور المشفّرة.</li>
              <li>بيانات الحجز: الأفلام، مواعيد العرض، المقاعد، والمبالغ.</li>
              <li>بيانات تقنية محدودة: عنوان IP ونوع الجهاز لتحسين الخدمة ومنع الاحتيال.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">2. كيف نستخدم البيانات</h2>
            <ul className="mt-2 list-disc space-y-1 pr-5">
              <li>تأكيد الحجوزات وإرسال التذاكر ورموز QR.</li>
              <li>معالجة المدفوعات عبر بوابة XPay (لا نخزّن بيانات بطاقتك).</li>
              <li>التواصل بخصوص الحجز والدعم الفني وإرسال عروض بموافقتك.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">3. المشاركة والاحتفاظ</h2>
            <p className="mt-2">
              لا نبيع بياناتك. نشاركها فقط مع مزودي الخدمة اللازمين (مثل XPay للمدفوعات) وبقدر ما يقتضيه القانون. نحتفظ بالبيانات طالما كان حسابك نشطاً أو للوفاء بالالتزامات القانونية.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">4. حقوقك</h2>
            <p className="mt-2">
              يحق لك طلب الاطلاع على بياناتك أو تصحيحها أو حذف حسابك عبر التواصل معنا. يمكنك أيضاً إلغاء اشتراك الرسائل الترويجية في أي وقت.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">5. الأمان وملفات الارتباط</h2>
            <p className="mt-2">
              نستخدم تشفيراً وإجراءات أمان لحماية بياناتك. يستخدم الموقع ملفات ارتباط (Cookies) لتحسين التجربة وتذكر اللغة وتسجيل الدخول.
            </p>
          </section>

          <p className="pt-4 text-xs text-white/40">
            للتواصل حول الخصوصية: 0227613045 — فيوتشر سينما.
          </p>
        </div>
      </div>
    </main>
  )
}
