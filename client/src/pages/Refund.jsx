import React from 'react'

export default function Refund() {
  return (
    <main className="container-x py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-black text-white sm:text-3xl">سياسة الاسترجاع والإلغاء</h1>
        <p className="mt-2 text-sm text-white/50">آخر تحديث: 27 أغسطس 2026</p>

        <div className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-white/70 sm:p-8 sm:text-[15px]">
          <section>
            <h2 className="text-base font-bold text-white">1. مهلة الإلغاء</h2>
            <p className="mt-2">
              يمكنك إلغاء الحجز واسترداد المبلغ <span className="font-bold text-white">حتى قبل موعد العرض بساعتين (2 ساعة)</span> على الأقل عبر صفحة &laquo;حجوزاتي&raquo; أو بالتواصل مع خدمة العملاء. لا يمكن الإلغاء أو الاسترجاع بعد هذا الموعد أو بعد بدء العرض.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">2. طريقة الاسترداد ومدته</h2>
            <ul className="mt-2 list-disc space-y-1 pr-5">
              <li>المدفوعات عبر <span className="font-bold text-white">XPay</span> يُرد المبلغ إلى نفس وسيلة الدفع الأصلية.</li>
              <li>تتم معالجة الاسترداد خلال <span className="font-bold text-white">5 إلى 10 أيام عمل</span> حسب البنك المُصدر للبطاقة.</li>
              <li>رسوم الخدمة غير قابلة للاسترداد إلا في حال إلغاء العرض من جانب السينما.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">3. إلغاء من جانب السينما</h2>
            <p className="mt-2">
              في حال إلغاء العرض أو تأجيله لظروف قاهرة، يحق لك استرداد كامل المبلغ أو تحويل الحجز لموعد بديل دون رسوم إضافية، وسيتم إشعارك عبر رقم الموبايل المسجل.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">4. حالات عدم الاسترجاع</h2>
            <ul className="mt-2 list-disc space-y-1 pr-5">
              <li>التأخر عن موعد العرض أو عدم الحضور.</li>
              <li>طلب الإلغاء قبل أقل من ساعتين من العرض.</li>
              <li>التذاكر المستخدمة أو التي تم مسح رمز QR الخاص بها عند الدخول.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white">5. كيفية طلب الإلغاء</h2>
            <p className="mt-2">
              سجّل الدخول → حجوزاتي → اختر الحجز → إلغاء الحجز. أو تواصل على <span dir="ltr">0227613045</span> مع ذكر رقم الحجز.
            </p>
          </section>

          <p className="pt-4 text-xs text-white/40">
            فيوتشر سينما — XCJG+RHC، مدينة نصر، القاهرة.
          </p>
        </div>
      </div>
    </main>
  )
}
