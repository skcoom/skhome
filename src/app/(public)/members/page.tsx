import Link from 'next/link';
import Image from 'next/image';
import { Phone, Users, Wrench, Heart } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  role: string;
  roleJa: string;
  image: string | null;
  initials: string;
  motto: string;
}

// 画像ファイルを追加したらimageパスを設定してください
// 例: image: '/members/suetake-shuhei.jpg'
const members: Member[] = [
  {
    id: '1',
    name: '末武 修平',
    role: 'CEO',
    roleJa: '代表取締役',
    image: null,
    initials: '修',
    motto: '',
  },
  {
    id: '2',
    name: '末武 剛',
    role: 'Master Craftsman',
    roleJa: '親方',
    image: null,
    initials: '剛',
    motto: '',
  },
  {
    id: '3',
    name: '末武 香代',
    role: 'Accounting',
    roleJa: '経理',
    image: null,
    initials: '香',
    motto: '',
  },
  {
    id: '4',
    name: '木村 翔',
    role: 'Electrician / Carpenter',
    roleJa: '電気・大工工事',
    image: null,
    initials: '翔',
    motto: '',
  },
  {
    id: '5',
    name: '本橋 拓真',
    role: 'Interior Craftsman',
    roleJa: '内装工事全般（修行中）',
    image: null,
    initials: '拓',
    motto: '',
  },
  {
    id: '6',
    name: '片山 雄太',
    role: 'Interior Craftsman',
    roleJa: '内装工事全般（修行中）',
    image: null,
    initials: '雄',
    motto: '',
  },
];

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="aspect-[3/4] bg-gradient-to-b from-[#E5E4E0] to-[#D5D4D0] relative overflow-hidden">
      {member.image ? (
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <div className="w-28 h-28 bg-[#26A69A] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <span className="text-4xl font-medium text-white">{member.initials}</span>
          </div>
          <span className="text-sm text-[#666666] tracking-wider">{member.roleJa}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-[#26A69A]/0 group-hover:bg-[#26A69A]/10 transition-colors pointer-events-none" />
    </div>
  );
}

const values = [
  {
    icon: Users,
    title: 'チームワーク',
    description: '一人ひとりの強みを活かし、チームで最高の結果を追求します。',
  },
  {
    icon: Wrench,
    title: '確かな技術',
    description: '長年の経験と継続的な学びで、高品質な施工をお届けします。',
  },
  {
    icon: Heart,
    title: 'お客様第一',
    description: 'お客様の想いに寄り添い、期待を超える仕上がりを目指します。',
  },
];

export default function MembersPage() {
  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero section */}
      <section className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">
              OUR TEAM
            </p>
            <h1 className="text-3xl lg:text-4xl font-medium leading-relaxed text-[#333333] mb-8">
              つくる人たち
            </h1>
            <p className="text-[#666666] leading-relaxed">
              SKコームは、経験豊富な職人たちが集まるチームです。
              お客様の想いを形にするため、一人ひとりが誇りを持って仕事に取り組んでいます。
            </p>
          </div>
        </div>

        {/* Vertical text */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2">
          <p className="vertical-text text-2xl tracking-widest text-[#E5E4E0] font-medium">
            チーム紹介
          </p>
        </div>
      </section>

      {/* Members grid section */}
      <section className="py-24 lg:py-32 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">MEMBERS</p>
            <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
              メンバー紹介
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-[#FAF9F6] rounded-xl overflow-hidden group"
              >
                <MemberCard member={member} />

                <div className="p-6 lg:p-8">
                  <p className="text-xs tracking-widest text-[#26A69A] mb-2">
                    {member.role}
                  </p>
                  <h3 className="text-xl font-medium text-[#333333] mb-4">
                    {member.name}
                  </h3>
                  {member.motto && (
                    <div className="border-l-2 border-[#26A69A] pl-4">
                      <p className="text-sm text-[#666666] leading-relaxed">
                        &ldquo;{member.motto}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">OUR VALUES</p>
            <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
              私たちが大切にしていること
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {values.map((value, index) => (
              <div key={index} className="bg-[#F0EFE9] rounded-xl p-8 lg:p-10 text-center">
                <div className="w-16 h-16 bg-[#E0F2F1] rounded-full flex items-center justify-center mx-auto mb-6">
                  <value.icon className="h-8 w-8 text-[#26A69A]" />
                </div>
                <h3 className="text-xl font-medium text-[#333333] mb-4">
                  {value.title}
                </h3>
                <p className="text-[#666666] text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-24 lg:py-32 bg-[#F0EFE9]">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">CONTACT</p>
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-6">
            私たちと一緒に、<br className="sm:hidden" />
            理想の住まいをつくりませんか？
          </h2>
          <p className="text-[#666666] mb-12 leading-relaxed">
            リフォームのことなら何でもお気軽にご相談ください。<br />
            現地調査・お見積りは無料です。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="tel:048-711-1359"
              className="inline-flex items-center justify-center border border-[#26A69A] text-[#26A69A] px-8 py-4 text-sm tracking-wide hover:bg-[#26A69A] hover:text-white transition-colors"
            >
              <Phone className="mr-3 h-4 w-4" />
              048-711-1359
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-[#26A69A] text-white px-8 py-4 text-sm font-medium tracking-wide hover:bg-[#009688] transition-colors"
            >
              お問い合わせフォーム
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
