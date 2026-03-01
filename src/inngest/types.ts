export type Events = {
  "analysis/upload.completed": {
    data: {
      analysisId: string;
      userId: string;
      imageUrl: string;
    };
  };
};
