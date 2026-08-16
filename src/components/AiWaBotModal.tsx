import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  MessageSquare,
  UserCheck,
  SendHorizontal,
  Copy,
  Check,
  Edit3,
  Phone,
  RefreshCw,
  Search,
  Users,
  AlertCircle,
  FileText
} from 'lucide-react';
import { getSiswaList, getAppConfig } from '../services/storage';
import { Siswa } from '../types';

interface MessageItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestedCards?: Array<{
    namaSiswa: string;
    nisn: string;
    kelas: string;
    noHp: string;
    targetType?: string;
    pesanWA: string;
    kategori?: string;
  }>;
}

interface AiWaBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AiWaBotModal: React.FC<AiWaBotModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Halo! Saya **Asisten AI Chatbot WhatsApp Presensi**. \n\nSaya bisa membantu Anda mencari data siswa dan menyusun pesan WhatsApp yang rapi, formal, dan personal untuk wali murid. Silakan ketik perintah Anda!',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || loading) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputText('');
    setLoading(true);

    const siswaList = getSiswaList();
    const config = getAppConfig();

    try {
      // Call Gemini Server Endpoint
      const res = await fetch('/api/ai-wa-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend,
          studentList: siswaList.map((s) => ({
            nama: s.nama,
            nisn: s.nisn,
            kelas: s.kelas,
            noHp: s.noHp || '',
            statusWA: s.waVerified ? 'Terverifikasi' : 'Belum Verifikasi',
          })),
          schoolName: config.nama_sekolah || 'SEKOLAH',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        const botMsg: MessageItem = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.replyText || 'Berikut draft pesan WhatsApp yang dapat Anda kirimkan:',
          suggestedCards: data.suggestedMessages || [],
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        // Fallback to local smart match logic if API key missing or error
        fallbackLocalBotResponse(textToSend, siswaList, config);
      }
    } catch (err) {
      console.warn('AI API Error, fallback to local match:', err);
      fallbackLocalBotResponse(textToSend, siswaList, config);
    } finally {
      setLoading(false);
    }
  };

  const fallbackLocalBotResponse = (query: string, siswaList: Siswa[], config: any) => {
    const q = query.toLowerCase();
    const schoolName = config.nama_sekolah || 'SEKOLAH';

    const now = new Date();
    const hariTanggal = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const jamNow = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Find matching students by name, class, or keyword
    let matchedSiswa = siswaList.filter((s) => {
      const nameMatch = (s.nama || '').toLowerCase().includes(q);
      const classMatch = (s.kelas || '').toLowerCase().includes(q);
      const nisnMatch = (s.nisn || '').includes(q);
      return nameMatch || classMatch || nisnMatch;
    });

    if (matchedSiswa.length === 0) {
      // If no specific match, take top 3 active students
      matchedSiswa = siswaList.slice(0, 3);
    } else if (matchedSiswa.length > 5) {
      matchedSiswa = matchedSiswa.slice(0, 5);
    }

    const cards = matchedSiswa.map((s) => {
      const namaOrtu = s.namaAyah || s.namaIbu || 'Orang Tua / Wali';
      let msgType = 'Notifikasi Kehadiran';
      let waMsg = '';

      if (q.includes('pulang')) {
        msgType = 'Absen Pulang';
        waMsg = `Halo Bpk/Ibu ${namaOrtu},

Informasi Kepulangan: Ananda *${s.nama}* (Kelas ${s.kelas}) telah melakukan absen pulang dari *${schoolName}* pada hari ${hariTanggal} pukul ${jamNow} WIB. Hati-hati di jalan. Terima kasih.`;
      } else if (q.includes('terlambat')) {
        msgType = 'Terlambat';
        waMsg = `Halo Bpk/Ibu ${namaOrtu},

Pemberitahuan Absensi: Ananda *${s.nama}* (Kelas ${s.kelas}) tercatat datang terlambat di *${schoolName}* pada ${hariTanggal} pukul ${jamNow} WIB. Mohon perhatiannya, terima kasih.`;
      } else if (q.includes('alpha') || q.includes('peringatan') || q.includes('bolos')) {
        msgType = 'Peringatan Alpha';
        waMsg = `Perhatian: Ananda *${s.nama}* (Kelas ${s.kelas}) tidak hadir di *${schoolName}* hari ini (${hariTanggal}) tanpa keterangan (Alpha). Mohon konfirmasi segera kepada pihak sekolah atau Wali Kelas. Terima kasih.`;
      } else if (q.includes('izin') || q.includes('sakit')) {
        msgType = 'Pemberitahuan Izin/Sakit';
        waMsg = `Halo Bpk/Ibu ${namaOrtu},

Kami informasikan bahwa surat izin/sakit Ananda *${s.nama}* (Kelas ${s.kelas}) pada hari ${hariTanggal} telah dicatat oleh pihak sekolah. Semoga ananda lekas membaik/bermanfaat. Terima kasih.`;
      } else {
        // Default Absen Masuk / Hadir
        msgType = 'Absen Masuk (Hadir)';
        waMsg = `Halo Bpk/Ibu ${namaOrtu},

Informasi kehadiran siswa: Ananda *${s.nama}* (Kelas ${s.kelas}) telah hadir dan masuk di *${schoolName}* pada hari ${hariTanggal} pukul ${jamNow} WIB. Terima kasih.`;
      }

      return {
        namaSiswa: s.nama,
        nisn: s.nisn,
        kelas: s.kelas,
        noHp: s.noHp || '',
        targetType: 'Orang Tua',
        pesanWA: waMsg,
        kategori: msgType,
      };
    });

    const botMsg: MessageItem = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `Saya telah menyusun draft pesan WhatsApp untuk ${cards.length} siswa berdasarkan pencarian "${query}". Anda dapat langsung meninjau dan mengeklik tombol **Kirim WA**:`,
      suggestedCards: cards,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, botMsg]);
  };

  const handleOpenWhatsApp = (phone: string, text: string) => {
    if (!phone || !phone.trim()) {
      onShowToast('Nomor HP/WhatsApp siswa ini belum terdaftar di data siswa.', 'error');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    let formatted = cleanPhone;
    if (formatted.startsWith('0')) {
      formatted = '62' + formatted.slice(1);
    } else if (!formatted.startsWith('62')) {
      formatted = '62' + formatted;
    }

    const encoded = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?phone=${formatted}&text=${encoded}`;
    window.open(waUrl, '_blank');
    onShowToast(`Membuka WhatsApp untuk mengirim pesan ke ${phone}...`, 'success');
  };

  const handleCopyText = (text: string, cardIndexStr: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(cardIndexStr);
    onShowToast('Pesan WhatsApp berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    '☀️ Pesan WA Absen Masuk (Hadir)',
    '🏠 Pesan WA Absen Pulang',
    '⚠️ Pesan WA Siswa Terlambat / Alpha',
    '📩 Pengumuman & Surat Izin Sakit',
    '📊 Kirim rekapan presensi siswa',
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full h-[88vh] max-h-[720px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up">
        {/* Chatbot Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Bot className="w-6 h-6 text-emerald-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">AI Chatbot WhatsApp</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-emerald-100 border border-white/20">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Asisten Otomatisasi Pesan WhatsApp Wali Murid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="bg-slate-50 border-b border-slate-200 p-2.5 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2 shrink-0">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0 px-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Saran Cepat:
          </span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-[11px] font-semibold bg-white text-slate-700 border border-slate-200/80 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 px-3 py-1 rounded-full transition cursor-pointer shrink-0 shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-100/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              } space-y-1`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Suggested WA Cards if any */}
                {msg.suggestedCards && msg.suggestedCards.length > 0 && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      Daftar Pesan WhatsApp Siap Kirim ({msg.suggestedCards.length})
                    </p>

                    {msg.suggestedCards.map((card, cIdx) => {
                      const cardUniqueId = `${msg.id}-card-${cIdx}`;
                      const isEditing = editingCardId === cardUniqueId;
                      const currentPesan = isEditing ? editedText : card.pesanWA;

                      return (
                        <div
                          key={cIdx}
                          className="bg-emerald-50/60 border border-emerald-200/90 rounded-2xl p-3 space-y-2 text-slate-800 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
                            <div>
                              <p className="font-extrabold text-emerald-950 text-xs">{card.namaSiswa}</p>
                              <p className="text-[10px] text-emerald-700 font-medium">
                                Kelas {card.kelas} • NISN: {card.nisn}
                              </p>
                            </div>
                            <div className="text-right">
                              {card.noHp ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-mono">
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  {card.noHp}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  Tanpa No. HP
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Message Box */}
                          {isEditing ? (
                            <textarea
                              value={editedText}
                              onChange={(e) => setEditedText(e.target.value)}
                              className="w-full bg-white border border-emerald-300 rounded-xl p-2 font-mono text-xs text-slate-800 focus:ring-emerald-500 focus:border-emerald-500 min-h-[110px]"
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap font-sans text-slate-700 bg-white/80 p-2.5 rounded-xl border border-emerald-100/80 text-[11px] leading-relaxed">
                              {currentPesan}
                            </pre>
                          )}

                          {/* Card Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <button
                                  onClick={() => {
                                    card.pesanWA = editedText;
                                    setEditingCardId(null);
                                    onShowToast('Teks pesan WhatsApp diperbarui.', 'success');
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition"
                                >
                                  Simpan Edit
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingCardId(cardUniqueId);
                                    setEditedText(card.pesanWA);
                                  }}
                                  className="px-2 py-1 text-slate-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit Pesan
                                </button>
                              )}

                              <button
                                onClick={() => handleCopyText(currentPesan, cardUniqueId)}
                                className="px-2 py-1 text-slate-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                {copiedId === cardUniqueId ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" /> Disalin
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" /> Salin Teks
                                  </>
                                )}
                              </button>
                            </div>

                            <button
                              onClick={() => handleOpenWhatsApp(card.noHp, currentPesan)}
                              disabled={!card.noHp || !card.noHp.trim()}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs ${
                                card.noHp && card.noHp.trim() !== ''
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                              }`}
                            >
                              <SendHorizontal className="w-3.5 h-3.5" />
                              <span>Kirim WA Sekarang</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs bg-white p-3 rounded-2xl border border-slate-200 w-fit animate-pulse">
              <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>AI sedang memproses data siswa &amp; menyusun pesan WhatsApp...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tulis pesan atau minta AI cari siswa (misal: 'Kirim peringatan ke ortu Budi')..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className={`p-2.5 sm:px-5 sm:py-2.5 rounded-2xl text-xs font-extrabold text-white flex items-center gap-2 transition cursor-pointer ${
                inputText.trim() && !loading
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md active:scale-95'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
