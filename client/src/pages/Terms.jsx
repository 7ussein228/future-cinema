import React from 'react'

export default function Terms() {
  return (
    <main className="container-x py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-black text-white sm:text-3xl">الشروط والأحكام</h1>
        <p className="mt-2 text-sm text-white/50">آخر تحديث: 27 أغسطس 2026</p>

        <div className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-white/70 sm:p-8 sm:text-[15px]">
          <section>
            <h2 className="text-base font-bold text-white">1. القبول والاستخدام</h2>
            <p className="mt-2">
              باستخدامك لموقع وتطبيق <span className="font-bold text-white">فيوتشر سينما</span> فإنك توافق على هذه الشروط. الخدمة مخصصة لحجز تذاكر السينما وتصفح الأفلام ومواعيد العرض. يُحظر إساءة استخدام الموقع أو محاولة اختراقه أو انتحال صفة الغير.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">2. الحجوزات والتذاكر</h2>
            <ul className="mt-2 list-disc space-y-1 pr-5">
              <li>التذكرة صالحة للعرض والموعد والمقعد المحدد فقط.</li>
              <li>يجب الحضور قبل موعد العرض بـ 15 دقيقة على الأقل وإبراز رمز QR أو رقم الحجز.</li>
              <li>يمنع إدخال المأكولات والمشروبات من خارج السينما، ويُحظر التدخين والتصوير داخل القاعة.</li>
              <li>إدارة السينما يحق لها رفض الدخول أو إخراج أي شخص يسبب إزعاجاً دون استرداد.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">3. الأسعار والدفع</h2>
            <p className="mt-2">
              جميع الأسعار بالجنيه المصري وتشمل الضرائب ما لم يُذكر خلاف ذلك. يتم الدفع إلكترونياً عبر بوابة <span className="font-bold text-white">XPay</span> بشكل آمن. في حال فشل الدفع لا يتم تأكيد الحجز ولا يُخصم أي مبلغ.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">4. المسؤولية</h2>
            <p className="mt-2">
              نبذل جهدنا لضمان دقة مواعيد العرض وتوافر المقاعد، لكن قد تطرأ تغييرات اضطرارية (تأجيل أو إلغاء عرض). في هذه الحالة يحق للعميل استرداد كامل أو اختيار موعد بديل حسب سياسة الاسترجاع.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">5. التعديلات</h2>
            <p className="mt-2">
              يحق لفيوتشر سينما تعديل هذه الشروط في أي وقت، ويُعتبر استمرارك في استخدام الموقع بعد النشر موافقة على التعديلات.
            </p>
          </section>

          <p className="pt-4 text-xs text-white/40">
            للاستفسار: 0227613045 — فيوتشر سينما، مدينة نصر، القاهرة.
          </p>
        </div>
      </div>
    </main>
  )
}
