import { useState, useEffect, useMemo } from 'react';
import { db, auth, onAuthStateChanged, signInAnonymously } from './firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- SVG 圖示組件 ---
const SpeakerIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>
);
const EditIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const DeleteIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const INITIAL_FORM_STATE = {
  level: 'N5', pattern: '', usage: '', meaning: '', example_ja: '', example_zh: '',
};

const LEVELS = ['全部', 'N1', 'N2', 'N3', 'N4', 'N5'];

function App() {
  // --- State 與 Hooks (狀態管理) ---
  const [allPatterns, setAllPatterns] = useState([]); 
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false); 
  
  const [mode, setMode] = useState('practice'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [formPattern, setFormPattern] = useState(INITIAL_FORM_STATE);
  const [formMessage, setFormMessage] = useState('');
  
  const [isEditing, setIsEditing] = useState(false); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const [quizState, setQuizState] = useState({ active: false, question: null, options: [], selectedAnswer: null, isCorrect: null, error: null });
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const [levelFilter, setLevelFilter] = useState('全部');

  const filteredPatternsForPractice = useMemo(() => {
    if (levelFilter === '全部') {
      return allPatterns;
    }
    return allPatterns.filter(p => p.level === levelFilter);
  }, [allPatterns, levelFilter]);


  // 處理 Firebase 認證
  useEffect(() => {
    document.title = "日語句型練習帳";
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) setIsAuthReady(true);
      else {
        signInAnonymously(auth).catch(err => {
          console.error("匿名登入失敗:", err);
          setError("後端服務連接失敗。");
          setLoading(false);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // 監聽 Firestore 資料庫即時變化
  useEffect(() => {
    if (!isAuthReady) return;
    setLoading(true);
    const patternsCollectionRef = collection(db, 'sentencePatterns');
    const unsubscribe = onSnapshot(patternsCollectionRef, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllPatterns(data);
      setLoading(false);
    }, err => {
      console.error("資料讀取失敗:", err);
      setError("資料載入失敗，請確認安全規則設定。");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAuthReady]);
  
  useEffect(() => {
    setCurrentIndex(0);
  }, [levelFilter]);

  // --- 功能函式 ---
  const handleNext = () => {
    if (filteredPatternsForPractice.length > 0) {
      setCurrentIndex(prev => (prev + 1) % filteredPatternsForPractice.length);
      setShowTranslation(false); 
    }
  };

  const handlePrevious = () => {
    if (filteredPatternsForPractice.length > 0) {
      setCurrentIndex(prev => (prev - 1 + filteredPatternsForPractice.length) % filteredPatternsForPractice.length);
      setShowTranslation(false);
    }
  };
  
  const handleSpeak = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP'; 
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSearchResultClick = (clickedPattern) => {
    const newIndex = allPatterns.findIndex(p => p.id === clickedPattern.id);
    if (newIndex !== -1) {
      setLevelFilter('全部');
      setCurrentIndex(newIndex);
      setMode('practice');
      setSearchTerm('');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormPattern(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPattern = async (e) => {
    e.preventDefault();
    if (!formPattern.pattern || !formPattern.meaning) {
      setFormMessage({ type: 'error', text: '「句型」和「中文意思」為必填欄位。' });
      return;
    }
    try {
      setFormMessage({ type: 'loading', text: '儲存中...' });
      const {id, ...dataToAdd} = formPattern;
      const patternsCollectionRef = collection(db, 'sentencePatterns');
      await addDoc(patternsCollectionRef, dataToAdd);
      setFormMessage({ type: 'success', text: `句型「${formPattern.pattern}」已成功新增！` });
      setFormPattern(INITIAL_FORM_STATE);
      setTimeout(() => setFormMessage(''), 3000);
    } catch (err) {
      console.error("新增資料時發生錯誤:", err);
      setFormMessage({ type: 'error', text: '新增失敗，請稍後再試。' });
    }
  };

  const handleUpdatePattern = async (e) => {
    e.preventDefault();
    if (!formPattern.id) return;
    try {
      setFormMessage({ type: 'loading', text: '更新中...' });
      const { id, ...dataToUpdate } = formPattern; 
      const patternRef = doc(db, 'sentencePatterns', id);
      await updateDoc(patternRef, dataToUpdate);
      setFormMessage({ type: 'success', text: '更新成功！' });
      setIsEditing(false);
      setMode('practice');
      setTimeout(() => setFormMessage(''), 3000);
    } catch (err) {
       console.error("更新資料時發生錯誤:", err);
       setFormMessage({ type: 'error', text: '更新失敗，請稍後再試。' });
    }
  };
  
  const handleDeletePattern = async (patternId) => {
    if (!patternId) return;
    try {
      const patternRef = doc(db, 'sentencePatterns', patternId);
      await deleteDoc(patternRef);
      setShowDeleteConfirm(null); 
    } catch (err) {
      console.error("刪除資料時發生錯誤:", err);
      alert("刪除失敗！");
    }
  };

  const generateQuestion = () => {
    const questionIndex = Math.floor(Math.random() * allPatterns.length);
    const question = allPatterns[questionIndex];

    let options = [question];
    while (options.length < 4) {
      const optionIndex = Math.floor(Math.random() * allPatterns.length);
      const option = allPatterns[optionIndex];
      if (!options.find(o => o.id === option.id)) {
        options.push(option);
      }
    }
    
    options.sort(() => Math.random() - 0.5);

    setQuizState({ active: true, question, options, selectedAnswer: null, isCorrect: null, error: null });
  };

  const handleAnswer = (option) => {
    if (quizState.selectedAnswer) return;

    const isCorrect = option.id === quizState.question.id;
    setQuizState(prev => ({ ...prev, selectedAnswer: option, isCorrect }));
    setScore(prev => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));
  };

  const startQuiz = () => {
    if (allPatterns.length < 4) {
      setQuizState(prev => ({ ...prev, error: "測驗需要至少4個句型才能開始。" }));
      return;
    }
    setScore({ correct: 0, total: 0 });
    generateQuestion();
  };


  const searchFilteredPatterns = allPatterns.filter(p => 
    p.pattern?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.meaning?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.usage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.example_ja?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.example_zh?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- 渲染邏輯 ---
  const renderPracticeMode = () => {
    const currentPattern = filteredPatternsForPractice.length > 0 ? filteredPatternsForPractice[currentIndex] : null;

    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-center space-x-2 flex-wrap">
          {LEVELS.map(level => (
            <button 
              key={level} 
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${levelFilter === level ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {level}
            </button>
          ))}
        </div>
        
        {!currentPattern ? (
          <div className="flex items-center justify-center h-full text-gray-500 p-8 text-center">
            {levelFilter === '全部' ? '資料庫無資料' : `沒有符合等級 ${levelFilter} 的句型`}
          </div>
        ) : (
          <div className="p-8 lg:p-12 flex-grow flex flex-col">
            <div className="relative flex-grow flex flex-col justify-center text-center pb-8">
              <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight">{currentPattern.pattern}</h1>
              <div className="mt-6">
                  <span className="bg-gray-100 text-gray-800 font-bold px-4 py-2 rounded-full text-sm">{currentPattern.level || 'N/A'}</span>
              </div>
              <div className="mt-8 bg-amber-50 p-4 rounded-lg inline-block self-center">
                <p className="font-mono text-lg text-gray-800 font-bold">{currentPattern.usage}</p>
              </div>
              <p className="mt-6 text-xl lg:text-2xl text-gray-700 font-bold">{currentPattern.meaning}</p>
              <div className="absolute bottom-8 right-0 flex space-x-2">
                  <button onClick={() => { setFormPattern(currentPattern); setIsEditing(true); }} className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"><EditIcon /><span>修改</span></button>
                  <button onClick={() => setShowDeleteConfirm(currentPattern.id)} className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"><DeleteIcon /><span>刪除</span></button>
              </div>
            </div>
            <div className="mt-auto pt-8 border-t-2 border-red-700">
              <div className="flex items-center space-x-5">
                <button onClick={() => handleSpeak(currentPattern.example_ja)} className="text-gray-400 hover:text-blue-700 transition-colors flex-shrink-0"><SpeakerIcon /></button>
                <p className="text-2xl lg:text-3xl text-gray-800">{currentPattern.example_ja}</p>
              </div>
              <div className="mt-4 pl-11">
                  <button onClick={() => setShowTranslation(!showTranslation)} className="text-sm text-blue-700 hover:text-blue-900 transition-colors font-semibold">{showTranslation ? '隱藏翻譯' : '顯示翻譯'}</button>
                  {showTranslation && (<p className="mt-2 text-lg text-gray-600 bg-gray-50 p-4 rounded-md">{currentPattern.example_zh}</p>)}
              </div>
              <div className="mt-8 flex justify-between items-center">
                  <button onClick={handlePrevious} className="px-5 py-2 text-sm font-bold text-violet-800 bg-violet-200 hover:bg-violet-300 transition-colors rounded-md" disabled={filteredPatternsForPractice.length <= 1}>上一個</button>
                  <button onClick={handleNext} className="px-8 py-2 text-sm font-bold text-violet-800 bg-violet-200 hover:bg-violet-300 transition-colors rounded-md" disabled={filteredPatternsForPractice.length <= 1}>下一個</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderForm = (isEditMode) => (
    <div className="p-8 lg:p-12 h-full">
        <form onSubmit={isEditMode ? handleUpdatePattern : handleAddPattern} className="flex flex-col h-full space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">{isEditMode ? '編輯句型' : '新增句型'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">等級 (Level)</label>
                    <select name="level" value={formPattern.level} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"><option>N1</option><option>N2</option><option>N3</option><option>N4</option><option>N5</option></select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">句型 (Pattern) <span className="text-red-500">*</span></label>
                    <input type="text" name="pattern" value={formPattern.pattern} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">用法 (Usage)</label>
                <input type="text" name="usage" value={formPattern.usage} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">中文意思 (Meaning) <span className="text-red-500">*</span></label>
                <input type="text" name="meaning" value={formPattern.meaning} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">日文例句 (Example JA)</label>
                <textarea name="example_ja" value={formPattern.example_ja} onChange={handleFormChange} rows="2" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">中文例句 (Example ZH)</label>
                <textarea name="example_zh" value={formPattern.example_zh} onChange={handleFormChange} rows="2" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea>
            </div>
            <div className="flex-grow"></div>
            <div className="flex items-center justify-end space-x-4">
              {formMessage && (<span className={`${formMessage.type === 'success' ? 'text-green-600' : 'text-red-600'} text-sm`}>{formMessage.text}</span>)}
              <button type="button" onClick={() => { setIsEditing(false); setFormPattern(INITIAL_FORM_STATE); setMode('practice'); }} className="px-6 py-2 font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">取消</button>
              <button type="submit" className="px-6 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm" disabled={formMessage.type === 'loading'}>{isEditMode ? '更新句型' : '儲存新句型'}</button>
            </div>
        </form>
    </div>
  );

  const renderSearchMode = () => (
    <div className="p-8 lg:p-12 flex flex-col h-full">
      <input type="text" placeholder="查找句型 (例如：うちに, 趁著...)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-4 text-lg border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
      <div className="mt-6 flex-grow overflow-y-auto">
        {searchTerm && searchFilteredPatterns.length > 0 && (<ul className="space-y-2">{searchFilteredPatterns.map(p => (<li key={p.id} onClick={() => handleSearchResultClick(p)} className="p-4 bg-gray-50 hover:bg-blue-100 rounded-md cursor-pointer transition-colors"><p className="font-bold text-lg text-blue-800">{p.pattern}</p><p className="text-gray-600">{p.meaning}</p></li>))}</ul>)}
        {searchTerm && searchFilteredPatterns.length === 0 && (<p className="text-center text-gray-500 mt-10">找不到符合「{searchTerm}」的句型。</p>)}
      </div>
    </div>
  );

  const renderQuizMode = () => {
    if (quizState.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <p className="text-xl font-semibold text-red-600">{quizState.error}</p>
            <button onClick={() => { setQuizState(prev => ({...prev, error: null})); setMode('practice'); }} className="mt-6 px-6 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md">返回練習模式</button>
        </div>
      );
    }

    if (!quizState.active) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
            <h2 className="text-2xl font-bold text-gray-800">準備好挑戰了嗎？</h2>
            <p className="mt-2 text-gray-600">測驗將從您的句型庫中隨機出題。</p>
            <button onClick={startQuiz} className="mt-8 px-8 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-transform transform hover:scale-105">開始測驗</button>
        </div>
      );
    }

    const { question, options, selectedAnswer } = quizState;
    return (
        <div className="p-8 lg:p-12 flex flex-col h-full">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">測驗挑戰</h2>
                <p className="font-semibold text-lg">得分: <span className="text-green-600">{score.correct}</span> / {score.total}</p>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center">
                <p className="text-3xl text-center text-gray-800 font-medium mb-8">「{question.example_ja}」</p>
                <div className="w-full max-w-md grid grid-cols-1 gap-4">
                    {options.map(option => {
                        const isCorrectAnswer = option.id === question.id;
                        
                        let buttonClass = 'p-4 text-left border-2 rounded-lg transition-all';
                        let textClass = 'text-lg font-semibold';

                        if (selectedAnswer) {
                            if (isCorrectAnswer) {
                                textClass = 'text-2xl font-extrabold';
                                buttonClass += ' border-blue-500 bg-blue-50';
                            } else {
                                buttonClass += ' border-gray-200 opacity-40';
                            }
                        } else {
                            buttonClass += ' border-gray-300 hover:border-blue-500 hover:bg-blue-50';
                        }
                        
                        return (
                            <button key={option.id} onClick={() => handleAnswer(option)} disabled={!!selectedAnswer} className={buttonClass}>
                                <span className={textClass}>{option.meaning}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
             {selectedAnswer && (
                <div className="text-center mt-6">
                    <button onClick={generateQuestion} className="px-8 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-transform transform hover:scale-105">下一題</button>
                </div>
            )}
        </div>
    );
  };

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center h-full text-gray-500">載入中...</div>;
    if (error) return <div className="flex items-center justify-center h-full text-red-500 p-8">{error}</div>;
    
    switch(mode) {
      case 'practice': return renderPracticeMode();
      case 'search': return renderSearchMode();
      case 'add': return renderForm(false);
      case 'quiz': return renderQuizMode();
      default: return renderPracticeMode();
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-3xl min-h-[80vh] bg-white border border-gray-200 shadow-xl shadow-gray-200/50 rounded-lg flex flex-col overflow-hidden">
        <header className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-center text-gray-800">日語句型練習帳</h1>
        </header>

        {!isEditing && (
          <div className="flex border-b border-gray-200">
              <button onClick={() => setMode('practice')} className={`flex-1 py-4 text-center font-semibold transition-colors ${mode === 'practice' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>練習模式</button>
              <button onClick={() => setMode('search')} className={`flex-1 py-4 text-center font-semibold transition-colors border-l ${mode === 'search' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>查找句型</button>
              <button onClick={() => { setMode('add'); setFormPattern(INITIAL_FORM_STATE); }} className={`flex-1 py-4 text-center font-semibold transition-colors border-l ${mode === 'add' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>新增句型</button>
              <button onClick={() => { setMode('quiz'); setQuizState(prev => ({...prev, error: null})); }} className={`flex-1 py-4 text-center font-semibold transition-colors border-l ${mode === 'quiz' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>測驗挑戰</button>
          </div>
        )}
        
        <div className="flex-grow overflow-y-auto relative">
            {isEditing ? renderForm(true) : renderContent()}
        </div>
      </div>
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-yellow-50 rounded-lg shadow-xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-900">確認刪除</h3>
              <p className="mt-2 text-sm text-gray-600">您確定要刪除句型「{allPatterns.find(p=>p.id === showDeleteConfirm)?.pattern}」嗎？此操作無法復原。</p>
              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md">取消</button>
                <button onClick={() => handleDeletePattern(showDeleteConfirm)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">確定刪除</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

