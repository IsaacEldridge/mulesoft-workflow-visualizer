import { createContext, useContext, useState } from 'react';

const WorkflowContext = createContext(null);

export function WorkflowProvider({ children }) {
  // Navigation state
  const [currentView, setCurrentView] = useState('authoring');

  const [currentStage, setCurrentStage] = useState(null);
  const [completedStages, setCompletedStages] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Content generation state
  const [sourceContent, setSourceContent] = useState('');
  const [audience, setAudience] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [docUrls, setDocUrls] = useState([]);
  const [fetchedDocsContent, setFetchedDocsContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedDocTemplates, setSelectedDocTemplates] = useState(['simple_task', 'simple_concept']); // Default selections
  const [badgeType, setBadgeType] = useState('regular'); // 'regular' or 'quickLook'
  const [websiteUrls, setWebsiteUrls] = useState([]);
  const [fetchedWebsiteContent, setFetchedWebsiteContent] = useState('');
  const [figmaUrls, setFigmaUrls] = useState([]);
  const [fetchedFigmaContent, setFetchedFigmaContent] = useState('');
  const [generatedOutputs, setGeneratedOutputs] = useState({
    blogProposal: null,
    blogDraft: null,
    badgeProposal: null,
    badgeDraft: null,
    docDraft: null,
    jtbdDraft: null
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const selectStage = (stageId) => {
    setSelectedStage(stageId);
  };

  const startPlaythrough = () => {
    setIsPlaying(true);
    setCompletedStages([]);
    setCurrentStage(null);
  };

  const pausePlaythrough = () => {
    setIsPlaying(false);
  };

  const resetWorkflow = () => {
    setIsPlaying(false);
    setCurrentStage(null);
    setCompletedStages([]);
    setSelectedStage(null);
  };

  const markStageCompleted = (stageId) => {
    if (!completedStages.includes(stageId)) {
      setCompletedStages((prev) => [...prev, stageId]);
    }
  };

  const value = {
    // Navigation
    currentView,
    setCurrentView,
    // Workflow state
    currentStage,
    setCurrentStage,
    completedStages,
    markStageCompleted,
    selectedStage,
    selectStage,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    startPlaythrough,
    pausePlaythrough,
    resetWorkflow,
    // Content generation
    sourceContent,
    setSourceContent,
    audience,
    setAudience,
    customPrompt,
    setCustomPrompt,
    docUrls,
    setDocUrls,
    fetchedDocsContent,
    setFetchedDocsContent,
    uploadedFiles,
    setUploadedFiles,
    selectedDocTemplates,
    setSelectedDocTemplates,
    badgeType,
    setBadgeType,
    websiteUrls,
    setWebsiteUrls,
    fetchedWebsiteContent,
    setFetchedWebsiteContent,
    figmaUrls,
    setFigmaUrls,
    fetchedFigmaContent,
    setFetchedFigmaContent,
    generatedOutputs,
    setGeneratedOutputs,
    isGenerating,
    setIsGenerating,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
