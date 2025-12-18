'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Mail, Clock, MapPin, CheckCircle, ArrowRight } from 'lucide-react';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: '',
    message: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // デモ用: 2秒後に成功表示
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('Contact submitted:', formData);

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen">
        <div className="py-24 lg:py-32">
          <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center w-20 h-20 bg-[#E0F2F1] rounded-full mx-auto mb-8">
              <CheckCircle className="h-10 w-10 text-[#26A69A]" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-6">
              お問い合わせありがとうございます
            </h1>
            <p className="text-[#666666] leading-relaxed mb-12">
              内容を確認の上、担当者より折り返しご連絡いたします。<br />
              通常2〜3営業日以内にご返信いたします。
            </p>
            <Link
              href="/"
              className="inline-flex items-center text-[#26A69A] font-medium hover:text-[#009688] transition-colors"
            >
              トップページに戻る
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero section */}
      <section className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">
              CONTACT
            </p>
            <h1 className="text-3xl lg:text-4xl font-medium leading-relaxed text-[#333333] mb-8">
              お問い合わせ
            </h1>
            <p className="text-[#666666] leading-relaxed">
              リフォームのご相談、お見積りのご依頼など、<br />
              お気軽にお問い合わせください。<br />
              現地調査・お見積りは無料です。
            </p>
          </div>
        </div>

        {/* Vertical text */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2">
          <p className="vertical-text text-2xl tracking-widest text-[#E5E4E0] font-medium">
            お問い合わせ
          </p>
        </div>
      </section>

      {/* Contact info cards */}
      <section className="py-12 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#FAF9F6] rounded-xl p-6 lg:p-8">
              <div className="w-12 h-12 bg-[#E0F2F1] rounded-full flex items-center justify-center mb-4">
                <Phone className="h-5 w-5 text-[#26A69A]" />
              </div>
              <h3 className="text-sm font-medium text-[#999999] mb-2">お電話</h3>
              <p className="text-xl font-medium text-[#26A69A] mb-1">048-XXX-XXXX</p>
              <p className="text-xs text-[#999999]">受付: 9:00〜18:00（土日祝休）</p>
            </div>

            <div className="bg-[#FAF9F6] rounded-xl p-6 lg:p-8">
              <div className="w-12 h-12 bg-[#E0F2F1] rounded-full flex items-center justify-center mb-4">
                <Mail className="h-5 w-5 text-[#26A69A]" />
              </div>
              <h3 className="text-sm font-medium text-[#999999] mb-2">メール</h3>
              <p className="text-lg font-medium text-[#333333] mb-1">info@skcoom.co.jp</p>
              <p className="text-xs text-[#999999]">24時間受付</p>
            </div>

            <div className="bg-[#FAF9F6] rounded-xl p-6 lg:p-8">
              <div className="w-12 h-12 bg-[#E0F2F1] rounded-full flex items-center justify-center mb-4">
                <MapPin className="h-5 w-5 text-[#26A69A]" />
              </div>
              <h3 className="text-sm font-medium text-[#999999] mb-2">所在地</h3>
              <p className="text-sm text-[#333333] mb-1">埼玉県川口市八幡木3-7-1</p>
              <p className="text-xs text-[#999999]">鳩ヶ谷駅より徒歩15分</p>
            </div>
          </div>
        </div>
      </section>

      {/* Form section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Form */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-xl p-8 lg:p-12 shadow-sm">
                <h2 className="text-xl font-medium text-[#333333] mb-8">
                  お問い合わせフォーム
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-[#333333] mb-2">
                        お名前 <span className="text-[#26A69A]">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="山田 太郎"
                        required
                        className="w-full px-4 py-3 border border-[#E5E4E0] rounded-lg focus:outline-none focus:border-[#26A69A] focus:ring-1 focus:ring-[#26A69A] transition-colors text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-[#333333] mb-2">
                        メールアドレス <span className="text-[#26A69A]">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="example@email.com"
                        required
                        className="w-full px-4 py-3 border border-[#E5E4E0] rounded-lg focus:outline-none focus:border-[#26A69A] focus:ring-1 focus:ring-[#26A69A] transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-[#333333] mb-2">
                        電話番号
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="090-1234-5678"
                        className="w-full px-4 py-3 border border-[#E5E4E0] rounded-lg focus:outline-none focus:border-[#26A69A] focus:ring-1 focus:ring-[#26A69A] transition-colors text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-[#333333] mb-2">
                        お問い合わせ種別
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-[#E5E4E0] rounded-lg focus:outline-none focus:border-[#26A69A] focus:ring-1 focus:ring-[#26A69A] transition-colors text-sm bg-white"
                      >
                        <option value="">選択してください</option>
                        <option value="estimate">お見積り依頼</option>
                        <option value="consultation">リフォーム相談</option>
                        <option value="inspection">現地調査の依頼</option>
                        <option value="other">その他</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-[#333333] mb-2">
                      お問い合わせ内容 <span className="text-[#26A69A]">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      placeholder="リフォームの内容、ご希望の時期、ご予算など、お気軽にお書きください。"
                      required
                      className="w-full px-4 py-3 border border-[#E5E4E0] rounded-lg focus:outline-none focus:border-[#26A69A] focus:ring-1 focus:ring-[#26A69A] transition-colors text-sm resize-none"
                    />
                  </div>

                  <div className="text-sm text-[#999999]">
                    <p>
                      ※ いただいた個人情報は、お問い合わせへの対応のみに使用し、
                      第三者への提供は行いません。
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#26A69A] text-white py-4 rounded-lg font-medium hover:bg-[#009688] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '送信中...' : '送信する'}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Urgent notice */}
              <div className="bg-[#E0F2F1] rounded-xl p-6">
                <h3 className="text-sm font-medium text-[#26A69A] mb-3">お急ぎの方へ</h3>
                <p className="text-sm text-[#666666] leading-relaxed mb-4">
                  お急ぎの場合は、お電話でのお問い合わせをおすすめします。
                </p>
                <a
                  href="tel:048-XXX-XXXX"
                  className="inline-flex items-center text-[#26A69A] font-medium text-sm"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  048-XXX-XXXX
                </a>
              </div>

              {/* Business hours */}
              <div className="bg-[#F0EFE9] rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Clock className="h-5 w-5 text-[#26A69A] mr-2" />
                  <h3 className="text-sm font-medium text-[#333333]">営業時間</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#666666]">平日</span>
                    <span className="text-[#333333]">9:00〜18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666666]">土日祝</span>
                    <span className="text-[#333333]">休業</span>
                  </div>
                </div>
              </div>

              {/* Service area */}
              <div className="bg-[#F0EFE9] rounded-xl p-6">
                <h3 className="text-sm font-medium text-[#333333] mb-4">対応エリア</h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  埼玉県川口市を中心に、東京都・埼玉県・千葉県の広いエリアに対応しております。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section className="py-16 lg:py-24 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">FAQ</p>
            <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
              よくあるご質問
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: '見積りは無料ですか？',
                a: 'はい、現地調査・お見積りは無料で承っております。お気軽にご依頼ください。',
              },
              {
                q: 'どのくらいの期間で工事が完了しますか？',
                a: '工事内容により異なりますが、キッチンリフォームで約1週間、フルリノベーションで1〜2ヶ月程度が目安です。',
              },
              {
                q: '住みながらの工事は可能ですか？',
                a: 'はい、多くの場合は住みながらの工事が可能です。工事内容に応じて、ご不便を最小限に抑える工程をご提案いたします。',
              },
              {
                q: '小さな修繕でも対応してもらえますか？',
                a: 'はい、小さな修繕から大規模なリノベーションまで、幅広く対応しております。',
              },
            ].map((faq, index) => (
              <div key={index} className="bg-[#FAF9F6] rounded-xl p-6">
                <h3 className="text-[#333333] font-medium mb-3 flex items-start">
                  <span className="text-[#26A69A] mr-3">Q.</span>
                  {faq.q}
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed pl-6">
                  <span className="text-[#26A69A] mr-1">A.</span>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
