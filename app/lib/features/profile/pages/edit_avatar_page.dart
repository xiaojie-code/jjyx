import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/utils/toast.dart';
import '../../auth/providers/auth_provider.dart';

class EditAvatarPage extends ConsumerStatefulWidget {
  const EditAvatarPage({super.key});

  @override
  ConsumerState<EditAvatarPage> createState() => _EditAvatarPageState();
}

class _EditAvatarPageState extends ConsumerState<EditAvatarPage> {
  XFile? _selectedFile;
  Uint8List? _imageBytes;
  bool _uploading = false;

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, maxWidth: 512, maxHeight: 512, imageQuality: 80);
    if (picked != null) {
      final bytes = await picked.readAsBytes();
      setState(() {
        _selectedFile = picked;
        _imageBytes = bytes;
      });
    }
  }

  Future<void> _upload() async {
    if (_selectedFile == null || _imageBytes == null) return;
    setState(() => _uploading = true);
    try {
      final filename = _selectedFile!.name.isNotEmpty ? _selectedFile!.name : 'avatar.jpg';
      final formData = FormData.fromMap({
        'avatar': MultipartFile.fromBytes(_imageBytes!, filename: filename),
      });
      await ref.read(apiClientProvider).upload(
        ApiEndpoints.updateAvatar,
        formData: formData,
      );
      await ref.read(authProvider.notifier).loadProfile();
      if (mounted) {
        Toast.success(context, '头像更新成功');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) Toast.error(context, '上传失败: $e');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('更换头像')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // 头像预览
              Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.grey.shade200,
                  image: _imageBytes != null
                      ? DecorationImage(image: MemoryImage(_imageBytes!), fit: BoxFit.cover)
                      : null,
                ),
                child: _imageBytes == null
                    ? const Icon(Icons.person, size: 70, color: Colors.grey)
                    : null,
              ),
              const SizedBox(height: 32),
              // 选择按钮
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text('相册'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                  ),
                  const SizedBox(width: 16),
                  if (!kIsWeb) // 拍照仅在非Web端显示
                    ElevatedButton.icon(
                      onPressed: () => _pickImage(ImageSource.camera),
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('拍照'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 32),
              // 上传按钮
              if (_imageBytes != null)
                SizedBox(
                  width: 200,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _uploading ? null : _upload,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: _uploading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('确认上传', style: TextStyle(fontSize: 16)),
                  ),
                ),
              const SizedBox(height: 16),
              const Text('建议上传正方形图片，大小不超过2MB', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}
