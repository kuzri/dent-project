const express = require('express');
const cors = require('cors');
const multer = require('multer');
const AWS = require('aws-sdk');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config()

const app = express();
const PORT = process.env.PORT || 3001;

// AWS SDK 설정
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-northeast-2'
});

console.log("DB_HOST env:", process.env.DB_HOST);
const s3 = new AWS.S3();

// RDS PostgreSQL 연결 설정
const dbPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// CORS 설정
app.use(cors(
//   {
//   // origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5147'],
//   origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5147'],
//   credentials: true
// }
));

// JSON 파싱 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer 설정 (메모리 스토리지 - S3 업로드용)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`지원하지 않는 파일 형식입니다: ${file.mimetype}`), false);
    }
  }
});

// 유틸리티 함수들
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase().substring(1);
};

const generateS3Key = (originalName) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);
  return `materials/${timestamp}-${random}-${baseName}${extension}`;
};

// S3 파일 업로드 함수
const uploadToS3 = async (file, key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private' // 프라이빗 버킷으로 설정
  };

  try {
    const result = await s3.upload(params).promise();
    return result;
  } catch (error) {
    console.error('S3 업로드 에러:', error);
    throw error;
  }
};

// S3에서 파일 삭제
const deleteFromS3 = async (key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key
  };

  try {
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 삭제 에러:', error);
    return false;
  }
};

// S3 파일 다운로드 URL 생성 (Presigned URL)
const generateDownloadUrl = (key, expiresIn = 3600) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Expires: expiresIn // 1시간
  };

  return s3.getSignedUrl('getObject', params);
};

// 에러 핸들링 미들웨어
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: '파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.',
        }
      });
    }
  }
  
  if (err.message.includes('지원하지 않는 파일 형식')) {
    return res.status(400).json({
      error: {
        code: 'UNSUPPORTED_FILE_TYPE',
        message: err.message,
      }
    });
  }
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.',
    }
  });
};

// ===== 강의 관련 API =====

// 월별 강의 조회
app.get('/api/lectures/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 3000) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '잘못된 년도입니다.',
          details: {
            field: 'year',
            value: year,
            constraint: '년도는 2000-3000 사이의 값이어야 합니다.'
          }
        }
      });
    }
    
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '잘못된 월입니다.',
          details: {
            field: 'month',
            value: month,
            constraint: '월은 1-12 사이의 값이어야 합니다.'
          }
        }
      });
    }

    // RDS PostgreSQL에서 해당 년월의 강의 조회
    const query = `
      SELECT 
        id, title, instructor, date, time, description, color_class as "colorClass",
        (SELECT string_agg(name, ',') FROM materials WHERE lecture_id = lectures.id) as materials
      FROM lectures 
      WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2
      ORDER BY date, time
    `;
    
    const result = await dbPool.query(query, [yearNum, monthNum]);
    const rows = result.rows;
    
    // materials 문자열을 배열로 변환
    const lectures = rows.map(lecture => ({
      ...lecture,
      materials: lecture.materials ? lecture.materials.split(',') : []
    }));
    
    res.json({
      data: lectures,
      total: lectures.length,
      year: yearNum,
      month: monthNum
    });
    
  } catch (error) {
    console.error('Error in GET /api/lectures/:year/:month:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '강의 데이터를 불러오는 중 오류가 발생했습니다.'
      }
    });
  }
});

// 특정 강의 조회
app.get('/api/lectures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lectureId = parseInt(id);
    
    if (isNaN(lectureId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '잘못된 강의 ID입니다.'
        }
      });
    }
    
    const query = `
      SELECT 
        id, title, instructor, date, time, description, color_class as "colorClass"
      FROM lectures 
      WHERE id = $1
    `;
    
    const result = await dbPool.query(query, [lectureId]);
    const rows = result.rows;
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: '강의를 찾을 수 없습니다.'
        }
      });
    }
    
    // 해당 강의의 자료들도 함께 조회
    const materialsQuery = `
      SELECT id, name, size, upload_date as "uploadDate", type, extension
      FROM materials 
      WHERE lecture_id = $1
    `;
    
    const materialResult = await dbPool.query(materialsQuery, [lectureId]);
    const materialRows = materialResult.rows;
    
    const lecture = {
      ...rows[0],
      materials: materialRows
    };
    
    res.json({ data: lecture });
    
  } catch (error) {
    console.error('Error in GET /api/lectures/:id:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '강의 데이터를 불러오는 중 오류가 발생했습니다.'
      }
    });
  }
});

// ===== 자료실 관련 API =====

// 모든 자료 조회
app.get('/api/materials', async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id, m.name, m.original_name as "originalName", m.size, m.size_bytes as "sizeBytes",
        m.type, m.extension, m.upload_date as "uploadDate", m.uploaded_by as "uploadedBy",
        m.lecture_id as "lectureId", m.download_count as "downloadCount",
        l.title as "lectureTitle"
      FROM materials m
      LEFT JOIN lectures l ON m.lecture_id = l.id
      ORDER BY m.upload_date DESC
    `;
    
    const result = await dbPool.query(query);
    const rows = result.rows;
    
    res.json({
      data: rows,
      total: rows.length
    });
    
  } catch (error) {
    console.error('Error in GET /api/materials:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '자료 데이터를 불러오는 중 오류가 발생했습니다.'
      }
    });
  }
});

// 파일 공유
app.get('/api/materials/share/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileIdNum = parseInt(fileId);
    
    if (isNaN(fileIdNum)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '잘못된 파일 ID입니다.'
        }
      });
    }
    
    // DB에서 파일 정보 조회
    const query = `
      SELECT id, name, s3_key as "s3Key"
      FROM materials 
      WHERE id = $1
    `;
    
    const result = await dbPool.query(query, [fileIdNum]);
    const rows = result.rows;
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: '파일을 찾을 수 없습니다.'
        }
      });
    }
    
    const material = rows[0];
    
    // 공유 토큰 생성
    const shareToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (parseInt(process.env.SHARE_LINK_EXPIRY_DAYS) || 7));
    
    // DB에 공유 정보 저장
    const insertQuery = `
      INSERT INTO share_tokens (token, material_id, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
    `;
    
    await dbPool.query(insertQuery, [shareToken, fileIdNum, expiresAt]);
    
    const shareUrl = `${req.protocol}://${req.get('host')}/shared/${shareToken}`;
    
    res.json({
      data: {
        fileId: fileIdNum,
        fileName: material.name,
        shareUrl,
        shareToken,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      },
      message: '파일 공유 링크가 생성되었습니다.'
    });
    
  } catch (error) {
    console.error('Error in GET /api/materials/share/:fileId:', error);
    res.status(500).json({
      error: {
        code: 'SHARE_FAILED',
        message: '파일 공유 중 오류가 발생했습니다.'
      }
    });
  }
});

// 파일 업로드
app.post('/api/materials/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '업로드할 파일이 없습니다.'
        }
      });
    }
    
    const { lectureId, category, description } = req.body;
    const uploadedFiles = [];
    const failedFiles = [];
    
    for (const file of req.files) {
      try {
        // S3에 파일 업로드
        const s3Key = generateS3Key(file.originalname);
        const s3Result = await uploadToS3(file, s3Key);
        
        // DB에 파일 정보 저장
        const insertQuery = `
          INSERT INTO materials (
            name, original_name, size, size_bytes, type, extension,
            upload_date, uploaded_by, lecture_id, s3_key, s3_url,
            category, description, download_count
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12, 0)
          RETURNING id
        `;
        
        const values = [
          file.originalname,
          file.originalname,
          formatFileSize(file.size),
          file.size,
          file.mimetype,
          getFileExtension(file.originalname),
          '현재사용자', // 실제 환경에서는 인증된 사용자 정보 사용
          lectureId ? parseInt(lectureId) : null,
          s3Key,
          s3Result.Location,
          category || 'general',
          description || ''
        ];
        
        const result = await dbPool.query(insertQuery, values);
        const insertId = result.rows[0].id;
        
        const newMaterial = {
          id: insertId,
          name: file.originalname,
          originalName: file.originalname,
          size: formatFileSize(file.size),
          sizeBytes: file.size,
          type: file.mimetype,
          extension: getFileExtension(file.originalname),
          uploadDate: new Date().toISOString(),
          uploadedBy: '현재사용자',
          lectureId: lectureId ? parseInt(lectureId) : null,
          downloadCount: 0,
          category: category || 'general',
          description: description || ''
        };
        
        uploadedFiles.push(newMaterial);
        
      } catch (error) {
        console.error('File processing error:', error);
        failedFiles.push({
          fileName: file.originalname,
          error: error.message
        });
      }
    }
    
    res.json({
      data: {
        uploadedFiles,
        failedFiles,
        totalUploaded: uploadedFiles.length,
        totalFailed: failedFiles.length
      },
      message: `${uploadedFiles.length}개 파일이 성공적으로 업로드되었습니다.`
    });
    
  } catch (error) {
    console.error('Error in POST /api/materials/upload:', error);
    res.status(500).json({
      error: {
        code: 'UPLOAD_FAILED',
        message: '파일 업로드 중 오류가 발생했습니다.'
      }
    });
  }
});

// 공유 파일 다운로드
app.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // DB에서 공유 토큰 확인
    const query = `
      SELECT st.material_id, st.expires_at, m.name, m.s3_key
      FROM share_tokens st
      JOIN materials m ON st.material_id = m.id
      WHERE st.token = $1
    `;
    
    const result = await dbPool.query(query, [token]);
    const rows = result.rows;
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: '유효하지 않은 공유 링크입니다.'
        }
      });
    }
    
    const shareInfo = rows[0];
    
    // 만료 시간 확인
    if (new Date() > new Date(shareInfo.expires_at)) {
      // 만료된 토큰 삭제
      await dbPool.query('DELETE FROM share_tokens WHERE token = $1', [token]);
      return res.status(410).json({
        error: {
          code: 'EXPIRED',
          message: '공유 링크가 만료되었습니다.'
        }
      });
    }
    
    // 다운로드 카운트 증가
    await dbPool.query(
      'UPDATE materials SET download_count = download_count + 1 WHERE id = $1',
      [shareInfo.material_id]
    );
    
    // S3에서 파일 다운로드 URL 생성
    const downloadUrl = generateDownloadUrl(shareInfo.s3_key);
    
    // 클라이언트를 다운로드 URL로 리다이렉트
    res.redirect(downloadUrl);
    
  } catch (error) {
    console.error('Error in GET /shared/:token:', error);
    res.status(500).json({
      error: {
        code: 'DOWNLOAD_FAILED',
        message: '파일 다운로드 중 오류가 발생했습니다.'
      }
    });
  }
});

// 자료 삭제
app.delete('/api/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const materialId = parseInt(id);
    
    if (isNaN(materialId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '잘못된 자료 ID입니다.'
        }
      });
    }
    
    // DB에서 파일 정보 조회
    const selectQuery = 'SELECT s3_key FROM materials WHERE id = $1';
    const result = await dbPool.query(selectQuery, [materialId]);
    const rows = result.rows;
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: '자료를 찾을 수 없습니다.'
        }
      });
    }
    
    const s3Key = rows[0].s3_key;
    
    // S3에서 파일 삭제
    await deleteFromS3(s3Key);
    
    // DB에서 자료 정보 삭제
    await dbPool.query('DELETE FROM materials WHERE id = $1', [materialId]);
    
    // 관련된 공유 토큰들도 삭제
    await dbPool.query('DELETE FROM share_tokens WHERE material_id = $1', [materialId]);
    
    res.json({
      message: '자료가 성공적으로 삭제되었습니다.',
      data: { id: materialId }
    });
    
  } catch (error) {
    console.error('Error in DELETE /api/materials/:id:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_FAILED',
        message: '자료 삭제 중 오류가 발생했습니다.'
      }
    });
  }
});

// DB 연결 테스트
app.get('/health', async (req, res) => {
  try {
    // DB 연결 테스트
    const result = await dbPool.query('SELECT 1 as connected');
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: result.rows[0].connected ? 'connected' : 'disconnected',
      s3: process.env.AWS_S3_BUCKET ? 'configured' : 'not configured'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// 에러 핸들링 미들웨어 적용
app.use(errorHandler);

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'API 엔드포인트를 찾을 수 없습니다.'
    }
  });
});

// 우아한 종료 처리
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM 신호를 받았습니다. 서버를 종료합니다...');
  await dbPool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT 신호를 받았습니다. 서버를 종료합니다...');
  await dbPool.end();
  process.exit(0);
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`☁️  S3 Bucket: ${process.env.AWS_S3_BUCKET}`);
});

module.exports = app;