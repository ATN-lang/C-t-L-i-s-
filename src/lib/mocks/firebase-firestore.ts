import { User } from './firebase-auth';

export class Timestamp {
  seconds: number;
  nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static now() {
    return Timestamp.fromDate(new Date());
  }

  static fromDate(date: Date) {
    const ms = date.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
  }

  toDate() {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
  }

  toMillis() {
    return this.seconds * 1000 + this.nanoseconds / 1000000;
  }

  toISOString() {
    return this.toDate().toISOString();
  }
}

export class MockDb {
  firestoreDatabaseId?: string;
  constructor(app?: any, firestoreDatabaseId?: string) {
    this.firestoreDatabaseId = firestoreDatabaseId;
  }
}

export function getFirestore(app?: any, databaseId?: string) {
  return new MockDb(app, databaseId);
}

export class MockIncrement {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}

export function increment(value: number) {
  return new MockIncrement(value);
}

export function serverTimestamp() {
  return Timestamp.now();
}

// Global state listeners list
type ListenerCallback = () => void;
const listeners: Set<ListenerCallback> = new Set();

function notifyListeners() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Error running listener callback:', e);
    }
  });
}

// Generate Seed Data
const getInitialSeedData = () => {
  const now = new Date();
  
  // Format dates relative to current local time to look modern and live
  const d = (daysOffset: number, hoursOffset: number = 0) => {
    const date = new Date(now);
    date.setDate(now.getDate() + daysOffset);
    date.setHours(date.getHours() + hoursOffset);
    return date.toISOString();
  };

  const ts = (daysOffset: number, hoursOffset: number = 0) => {
    const date = new Date(now);
    date.setDate(now.getDate() + daysOffset);
    date.setHours(date.getHours() + hoursOffset);
    return Timestamp.fromDate(date);
  };

  return {
    site_settings: {
      global: {
        siteName: "Cổng thông tin Phường Cát Lái Số",
        address: "Số 1 Đường Nguyễn Thị Định, Phường Cát Lái, TP. Thủ Đức, TP. Hồ Chí Minh",
        phone: "028 3742 1122",
        email: "ubnd.catlai@tphcm.gov.vn",
        logoUrl: "",
        autoApproveMembers: true,
        maxClubsPerStudent: 5
      }
    },
    stats: {
      global: {
        totalVisits: 2314
      }
    },
    roles: {
      "anrompro@gmail.com": {
        email: "anrompro@gmail.com",
        isAdmin: true,
        permissions: {
          canManageNews: true,
          canManageActivities: true,
          canManageSchedules: true,
          canManageRegistrations: true,
          canManageAchievements: true,
          canManageMembers: true,
          canManageMessages: true,
          canManageSettings: true,
          canManageUsers: true,
          canManageClubs: true,
          canDeleteContent: true,
          canCreateContent: true,
          canEditContent: true
        }
      },
      "jullynguyennn@gmail.com": {
        email: "jullynguyennn@gmail.com",
        isAdmin: true,
        permissions: {
          canManageNews: true,
          canManageActivities: true,
          canManageSchedules: true,
          canManageRegistrations: true,
          canManageAchievements: true,
          canManageMembers: true,
          canManageMessages: true,
          canManageSettings: true,
          canManageUsers: true,
          canManageClubs: true,
          canDeleteContent: true,
          canCreateContent: true,
          canEditContent: true
        }
      }
    },
    news: {
      "post_1": {
        id: "post_1",
        title: "Phường Cát Lái ra mắt Bản đồ số Hành chính công và Đội Công nghệ số cộng đồng",
        category: "Tin hoạt động",
        featured: true,
        image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=2071",
        desc: "UBND Phường Cát Lái chính thức công bố Bản đồ số hóa và tập huấn chuyên sâu cho 10 tổ công nghệ số tại địa bàn dân cư.",
        content: "### Số Hóa Hoạt Động Hành Chính Công\n\nNhằm đẩy mạnh đề án phát triển đô thị thông minh và chuyển đổi số giai đoạn 2025 - 2030, UBND Phường Cát Lái, TP. Thủ Đức đã ra mắt cổng dịch vụ công trực tuyến tích hợp **Bản đồ số Dịch vụ Hành chính công** tại địa phương.\n\nPhát biểu tại buổi lễ, Chủ tịch UBND Phường nhấn mạnh: 'Việc chuyển đổi sang mô hình **Phường Cát Lái Số** giúp gắn kết người dân với hệ thống công quyền trực tiếp, giảm thiểu tối đa các thủ tục giấy tờ hành chính tẻ nhạt.'\n\nBên cạnh đó, các thành viên thuộc **Tổ Công nghệ số cộng đồng** từ các khu phố đã được huấn luyện các kỹ năng hỗ trợ công dân nộp hồ sơ trực tuyến, tra cứu quy hoạch đất đai, đóng thuế phi nông nghiệp qua điện thoại di động trực quan. Điều này tiến tới phổ cập hóa công nghệ tới mọi tầng lớp nhân dân.",
        views: 842,
        publishedAt: ts(-5),
        createdAt: ts(-5)
      },
      "post_2": {
        id: "post_2",
        title: "Ngày hội Chuyển đổi số doanh nghiệp nhỏ và hộ kinh doanh cá thể",
        category: "Tin hoạt động",
        featured: false,
        image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=2070",
        desc: "Chương trình cung cấp giải pháp miễn phí về hóa đơn điện tử, chữ ký số và kỹ năng kinh doanh số cho tiểu thương.",
        content: "### Hỗ Trợ Đội Ngũ Kinh Doanh Địa Phương\n\nVừa qua, Phòng Kinh tế TP. Thủ Đức phối hợp UBND Phường Cát Lái đã tổ chức **Ngày hội thúc đẩy kinh tế số** tại Hội trường Ủy ban Phường.\n\nHơn 120 hộ kinh doanh, tiểu thương tại Chợ Cát Lái cùng đại diện các doanh nghiệp vừa và nhỏ trên địa bàn đã tham gia. Các chuyên gia đã hỗ trợ cài đặt trực tiếp hệ thống hóa đơn điện tử thông minh, chữ ký số miễn phí năm đầu tiên.\n\nĐây là bước đi vững chắc giúp thúc đẩy hoạt động thanh toán không tiền mặt trên toàn địa bàn phường, góp phần đưa Cát Lái tiến gần hơn tới mục tiêu đô thị thông minh.",
        views: 451,
        publishedAt: ts(-3),
        createdAt: ts(-3)
      },
      "post_3": {
        id: "post_3",
        title: "Khen thưởng các Gương tài năng trẻ và Công dân Số xuất sắc năm 2026",
          category: "Tin hoạt động",
          featured: true,
          image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=2070",
          desc: "Tuyên dương 15 cá nhân đi đầu trong phong trào số hóa dữ liệu cộng đồng, hỗ trợ 100% người dân cài đặt ứng dụng định danh.",
          content: "### Vinh Danh Các Công Dân Số Tiêu Biểu\n\nUBND Phường đã tổ chức hội nghị tổng kết Chiến dịch cao điểm số hóa thông tin công dân quốc gia.\n\nTrong đợt thi đua này, các bạn trẻ tình nguyện thuộc **Đoàn Thanh niên Phường Cát Lái** cùng **Tổ Công nghệ số cộng đồng** đã 'đi từng ngõ, gõ từng nhà' hỗ trợ thành công hơn 5000 người lớn tuổi kích hoạt tài khoản định danh số và tích hợp bảo hiểm y tế, giấy phép lái xe một cách nhanh chóng.\n\nHội nghị biểu dương tinh thần năng động sáng tạo của các gương mặt trẻ tiêu biểu, đóng góp thiết thực cho mục tiêu xây dựng chính quyền điện tử Cát Lái ngày một thân thiện, minh bạch.",
          views: 928,
          publishedAt: ts(-2),
          createdAt: ts(-2)
      },
      "post_4": {
        id: "post_4",
        title: "Thông báo lịch tiếp công dân và tư vấn trực tuyến thủ tục Đăng ký lưu trú mới",
        category: "Thông báo",
        featured: false,
        image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=2070",
        desc: "Lịch hỗ trợ tư vấn video call 24/7 và hệ thống đặt số thứ tự lấy lịch hành chính trực tuyến thuận lợi.",
        content: "### Đăng Ký Thủ Tục Trực Tuyến Đơn Giản\n\nTừ tuần này, Công an Phường Cát Lái triển khai tiếp đón nhận phản hồi và xử lý thủ tục đăng ký cư trú trực tuyến:\n\n1. **Khai báo cư trú**: Qua cổng dịch vụ công Quốc gia hoặc VNeID.\n2. **Xếp hàng trực tuyến**: Đăng ký khung giờ hẹn trực tiếp qua cổng thông tin trực tuyến.\n3. **Liên hệ hỗ trợ zalo**: Phòng ban tiếp đón nhân dân đã thiết lập kênh hỗ trợ 24/7.\n\nKính đề nghị nhân dân nắm rõ thông tin để thực hiện giao dịch hành chính một cách nhanh chóng, tránh tập trung đông người.",
        views: 652,
        publishedAt: ts(-1),
        createdAt: ts(-1)
      }
    },
    exemplary_members: {
      "m1": {
        id: "m1",
        name: "Trần Quốc Bảo",
        class: "Khu Phố 3",
        rank: "Công dân số xuất sắc",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
        achievement: "Đi đầu trong phong trào số hóa khu phố, hướng dẫn trực tiếp cho hơn 200 hộ dân cài đặt chữ ký số và nộp dịch vụ hành chính công trực tuyến.",
        createdAt: ts(-8)
      },
      "m2": {
        id: "m2",
        name: "Nguyễn Thị Mai Chi",
        class: "Ủy Ban Nhân Dân",
        rank: "Cán bộ công chức trẻ tiêu biểu",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
        achievement: "Tham mưu xây dựng Bản đồ số hành chính công đầu tiên tại địa bàn phường, giải quyết thành công 100% hồ sơ tiếp nhận trực tuyến đúng hạn.",
        createdAt: ts(-7)
      },
      "m3": {
        id: "m3",
        name: "Phạm Minh Hoàng",
        class: "Đoàn Thanh Niên",
        rank: "Thủ lĩnh thanh niên tình nguyện",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
        achievement: "Chịu trách nhiệm thành lập 10 tổ thanh niên xung kích hướng dẫn người dân định danh cư trú và phổ quát kỹ năng giao tiếp trên không gian mạng.",
        createdAt: ts(-6)
      }
    },
    collective_achievements: {
      "ach_1": {
        id: "ach_1",
        title: "Bằng vinh danh Đơn vị đi đầu Chuyển đổi số cấp Thành phố năm học 2024 - 2025",
        date: "15/08/2025",
        certificateImage: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1470",
        content: "UBND Phường Cát Lái xuất sắc nhận cờ thi đua và Bằng khen của UBND Thành phố Hồ Chí Minh vì đã có thành tích đặc biệt trong chỉ tiêu số hóa hành chính.",
        createdAt: ts(-15)
      },
      "ach_2": {
        id: "ach_2",
        title: "Giải Nhất đơn vị xuất sắc ứng dụng Công nghệ số trong quản lý đô thị",
        date: "26/03/2026",
        certificateImage: "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&q=80&w=1470",
        content: "Cát Lái vinh dự nhận giải thưởng danh giá nhờ hệ thống tích hợp giám sát trật tự an ninh đô thị, camera thông minh AI phối hợp lực lượng công an địa bàn.",
        createdAt: ts(-14)
      }
    },
    schedules: {
      "sk_1": {
        id: "sk_1",
        title: "Hội nghị Tập huấn Chuyển đổi số & Cấp phát Chữ ký số công dân miễn phí",
        date: d(1, 7), // Tomorrow at 7:00 AM
        time: "08:00 - 11:30",
        location: "Hội trường Ủy ban nhân dân Phường",
        notes: "Kính mời Ban điều hành 10 khu phố, đoàn viên và toàn thể công dân có nhu cầu số hóa kinh doanh đến tập huấn đầy đủ.",
        createdAt: ts(-1)
      },
      "sk_2": {
        id: "sk_2",
        title: "Làm việc tại cơ sở: Hỗ trợ tích hợp Thẻ Căn cước mới & Định danh VNeID mức độ 2",
        date: d(3, 14), // In 3 days at 2:00 PM
        time: "14:00 - 17:00",
        location: "Phòng Một cửa - Trụ sở UBND Phường Cát Lái",
        notes: "Người dân cần mang theo Căn cước công dân gắn chíp cũ và thiết bị điện thoại có đăng ký số điện thoại chính chủ.",
        createdAt: ts(-1)
      },
      "sk_3": {
        id: "sk_3",
        title: "Ra quân Ngày thứ bảy văn minh: Tuyên truyền thanh toán QR không tiền mặt",
        date: d(6, 8), // In 6 days at 8:00 AM
        time: "08:00 - 11:30",
        location: "Khu vực Chợ Cát Lái & Các tuyến đường trung tâm",
        notes: "Đội ngũ Công nghệ số cộng đồng và thanh niên hỗ trợ tiểu thương tạo bảng quét QR chất lượng cao miễn phí.",
        createdAt: ts(-1)
      }
    },
    activities: {
      "act_1": {
        id: "act_1",
        title: "Chiến dịch Phổ cập kỹ năng An toàn thông tin và Phòng lừa đảo mạng xã hội",
        category: "Tuyên truyền",
        location: "Hội trường UBND Phường Cát Lái",
        startDate: "2026-06-25",
        startTime: "08:00",
        endDate: "2026-06-25",
        endTime: "11:00",
        maxParticipants: 200,
        currentParticipants: 85,
        status: "Đang mở đăng ký",
        description: "Chương trình chuyên đề thiết thực hướng dẫn cách phân biệt các cuộc gọi ảo mạo mạo danh công an, lừa đảo chuyển khoản qua các trang web lừa đảo cực kỳ nguy hiểm.",
        posterUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=2071",
        createdAt: ts(-4)
      },
      "act_2": {
        id: "act_2",
        title: "Hội thi 'Ý tưởng Sáng tạo Xây dựng Đô thị thông minh Cát Lái Số 2026'",
        category: "Sáng tạo",
        location: "Sân trụ sở Ủy ban phường Cát Lái",
        startDate: "2026-06-28",
        startTime: "07:30",
        endDate: "2026-06-28",
        endTime: "16:00",
        maxParticipants: 150,
        currentParticipants: 110,
        status: "Đang mở đăng ký",
        description: "Sân chơi ứng dụng phần mềm điều khiển, giải pháp nhà xanh, tiết kiệm năng lượng công cộng và chia đổi giao lưu công nghệ trẻ đô thị.",
        posterUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=2070",
        createdAt: ts(-3)
      }
    },
    clubs: {
      "club_1": {
        id: "club_1",
        name: "Đội Công nghệ số Cộng đồng",
        category: "Chuyển đổi số",
        time: "Hoạt động thường xuyên",
        location: "Phòng Công nghệ số - UBND Phường",
        mentor: "Đ/c Nguyễn Duy Thanh",
        desc: "Lực lượng mũi nhọn gồm các đoàn viên công nghệ hỗ trợ hướng dẫn bà con thiết lập tài khoản chuyển đổi số, đăng ký biểu mẫu dịch vụ công trục tuyến, tra cứu dữ liệu cơ sở nhanh chóng.",
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=2070",
        requirements: "Có lòng nhiệt huyết và biết sử dụng smartphone cơ bản.",
        schedule: "Tập trung huấn luyện lúc 17h00 thứ Năm hằng tuần.",
        members: ["anrompro@gmail.com"],
        createdAt: ts(-10)
      },
      "club_2": {
        id: "club_2",
        name: "CLB Doanh chủ trẻ Khởi nghiệp Cát Lái",
        category: "Kinh tế",
        time: "Cuối tuần",
        location: "Trung tâm văn hóa thể thao phường",
        mentor: "Đ/c Trần Hoàng Long",
        desc: "Nơi chia sẻ, kết nối kinh nghiệm vận hành doanh nghiệp thương mại công nghệ, kinh doanh sàn giao dịch điện tử và nâng tầm thương hiệu OCOP Cát Lái.",
        image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=2070",
        requirements: "Học viên, đại diện doanh nghiệp nhỏ muốn học ứng dụng quản trị số.",
        schedule: "19h30 tối thứ Sáu hằng tuần.",
        members: [],
        createdAt: ts(-9)
      },
      "club_3": {
        id: "club_3",
        name: "CLB Mỹ thuật số & Thiết kế Mỹ thuật Cát Lái",
        category: "Nghệ thuật số",
        time: "Sáng thứ Bảy",
        location: "Thư viện Phường lầu 2",
        mentor: "Cô Phan Nhã Lam (Mỹ thuật)",
        desc: "Khám phá sáng tạo truyện tranh số, vẽ tay phác thảo trên tablet, nghệ thuật chụp ảnh quảng bá du lịch và tạo nên các sản phẩm truyền thông quảng bá về con người quê hương Cát Lái thân yêu.",
        image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=2070",
        requirements: "Đam mê thiết kế đồ họa hoặc chụp ảnh phong cảnh.",
        schedule: "08:30 - 11:30 sáng Thứ Bảy.",
        members: [],
        createdAt: ts(-8)
      }
    },
    gifts: {
      "g1": {
        id: "g1",
        title: "Sổ tay Học sinh chăm ngoan",
        description: "Sổ tay ghi chép giả da cao cấp có dấu ấn vàng của Liên đội Trường THCS Nguyễn Thị Định.",
        starsRequired: 20,
        quantity: 150,
        imageUrl: "https://images.unsplash.com/photo-1531346878377-a5ec20888e23?auto=format&fit=crop&q=80&w=500",
        createdAt: ts(-10)
      },
      "g2": {
        id: "g2",
        title: "Bút máy rèn chữ Nguyễn Thị Định",
        description: "Bút máy ngòi hoa tre siêu mềm, giúp rèn luyện thói quen viết chữ nắn nót thanh lịch.",
        starsRequired: 35,
        quantity: 80,
        imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=500",
        createdAt: ts(-9)
      },
      "g3": {
        id: "g3",
        title: "Huy hiệu Sao danh dự Liên đội",
        description: "Huy chương đúc nổi mạ vàng sáng lấp lánh dùng đeo ngực cho các đội viên có cống hiến đặc biệt.",
        starsRequired: 50,
        quantity: 25,
        imageUrl: "https://images.unsplash.com/photo-1590579492103-1259693e513b?auto=format&fit=crop&q=80&w=500",
        createdAt: ts(-8)
      }
    },
    user_stars: {
      "jullynguyennn@gmail.com": {
        userId: "jullynguyennn@gmail.com",
        userEmail: "jullynguyennn@gmail.com",
        userName: "Jully Nguyễn",
        stars: 75,
        updatedAt: ts(-1)
      },
      "anrompro@gmail.com": {
        userId: "anrompro@gmail.com",
        userEmail: "anrompro@gmail.com",
        userName: "Đội viên Gương mẫu",
        stars: 90,
        updatedAt: ts(-1)
      }
    },
    star_transactions: {
      "t1": {
        userId: "jullynguyennn@gmail.com",
        userEmail: "jullynguyennn@gmail.com",
        userName: "Jully Nguyễn",
        amount: 50,
        type: "award",
        description: "Được tặng vì hoàn thành xuất sắc thử thách Chiến dịch Hành lang không rác thải nhựa",
        createdAt: ts(-4)
      },
      "t2": {
        userId: "jullynguyennn@gmail.com",
        userEmail: "jullynguyennn@gmail.com",
        userName: "Jully Nguyễn",
        amount: 25,
        type: "award",
        description: "Tích lũy từ việc dọn dẹp vệ sinh khuôn viên trường học cuối tuần",
        createdAt: ts(-3)
      },
      "t3": {
        userId: "anrompro@gmail.com",
        userEmail: "anrompro@gmail.com",
        userName: "Đội viên Gương mẫu",
        amount: 90,
        type: "award",
        description: "Khen tặng thành tích Sáng lập Khoa học trẻ có mô hình xuất sắc nhất",
        createdAt: ts(-2)
      }
    },
    redemptions: {},
    registrations: {},
    messages: {
      "msg_1": {
        id: "msg_1",
        fullName: "Trần Anh Thư",
        email: "anhthu@gmail.com",
        phone: "0908123456",
        subject: "Đăng ký tham gia hỗ trợ Tổ công nghệ số cộng đồng khu dân cư 4",
        message: "Kính chào các anh chị phụ trách, em là sinh viên IT sống tại khu phố 4, em rất muốn đăng ký tham gia Đội công nghệ số để hỗ trợ bà con cài dịch vụ công trực tuyến. Xin cám ơn!",
        createdAt: ts(-1)
      }
    }
  };
};

function getLocalDatabase(): any {
  const dbStr = localStorage.getItem('cat_lai_so_local_db');
  if (!dbStr) {
    const defaultData = getInitialSeedData();
    localStorage.setItem('cat_lai_so_local_db', JSON.stringify(defaultData));
    return defaultData;
  }
  try {
    return JSON.parse(dbStr);
  } catch {
    const defaultData = getInitialSeedData();
    localStorage.setItem('cat_lai_so_local_db', JSON.stringify(defaultData));
    return defaultData;
  }
}

function saveLocalDatabase(db: any) {
  localStorage.setItem('cat_lai_so_local_db', JSON.stringify(db));
  notifyListeners();
}

// Mock references representation
export class MockRef {
  type: 'doc' | 'collection';
  path: string;
  id?: string;
  parentPath?: string;

  constructor(type: 'doc' | 'collection', path: string, id?: string, parentPath?: string) {
    this.type = type;
    this.path = path.trim().replace(/^\/|\/$/g, ''); // normalize path
    this.id = id;
    this.parentPath = parentPath;
  }
}

export function collection(dbOrRef: MockDb | MockRef, path: string): MockRef {
  if (dbOrRef instanceof MockRef) {
    return new MockRef('collection', `${dbOrRef.path}/${path}`, undefined, dbOrRef.path);
  }
  return new MockRef('collection', path);
}

export function doc(dbOrRef: MockDb | MockRef, path?: string, ...segments: string[]): MockRef {
  if (dbOrRef instanceof MockRef) {
    const docId = (path && typeof path === 'string' && path.trim() !== '') ? path : 'mock_id_' + Math.random().toString(36).substring(2, 11);
    const fullPath = [dbOrRef.path, docId, ...segments].filter(Boolean).join('/');
    const parts = fullPath.split('/');
    const id = parts[parts.length - 1];
    const parentPath = parts.slice(0, parts.length - 1).join('/');
    return new MockRef('doc', fullPath, id, parentPath);
  } else {
    const defaultPath = path || '';
    const segmentsClean = segments.filter(Boolean);
    const fullPath = [defaultPath, ...segmentsClean].join('/');
    const parts = fullPath.split('/');
    const id = parts[parts.length - 1] || 'mock_id_' + Math.random().toString(36).substring(2, 11);
    const parentPath = parts.slice(0, parts.length - 1).join('/');
    return new MockRef('doc', fullPath, id, parentPath);
  }
}

// Constraints queries
export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit';
  field?: string;
  operator?: string;
  value?: any;
  direction?: 'asc' | 'desc';
  count?: number;
}

export class MockQuery {
  collRef: MockRef;
  constraints: QueryConstraint[];

  constructor(collRef: MockRef, constraints: QueryConstraint[]) {
    this.collRef = collRef;
    this.constraints = constraints;
  }
}

export function query(collRef: MockRef, ...constraints: QueryConstraint[]): MockQuery {
  return new MockQuery(collRef, constraints);
}

export function where(field: string, operator: string, value: any): QueryConstraint {
  return { type: 'where', field, operator, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', field, direction };
}

export function limit(count: number): QueryConstraint {
  return { type: 'limit', count };
}

// Convert mock data storage objects to Timestamps if they look like ones
function parseDocumentData(data: any): any {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  
  const parsed = { ...data };
  for (const key in parsed) {
    const val = parsed[key];
    if (val && typeof val === 'object') {
      if (val.seconds !== undefined && val.nanoseconds !== undefined) {
        parsed[key] = new Timestamp(val.seconds, val.nanoseconds);
      } else {
        parsed[key] = parseDocumentData(val);
      }
    }
  }
  return parsed;
}

// Helper to extract nested properties from a path like 'user.roles'
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

// Snapshot representation
export class MockDocumentSnapshot {
  id: string;
  private _data: any;
  private _exists: boolean;

  constructor(id: string, data: any, exists: boolean) {
    this.id = id;
    this._data = parseDocumentData(data);
    this._exists = exists;
  }

  exists() {
    return this._exists;
  }

  data() {
    return this._exists ? { ...this._data } : undefined;
  }

  get(field: string) {
    return getNestedValue(this._data, field);
  }
}

export class MockQuerySnapshot {
  docs: MockDocumentSnapshot[];
  empty: boolean;

  constructor(docs: MockDocumentSnapshot[]) {
    this.docs = docs;
    this.empty = docs.length === 0;
  }
}

export async function getDoc(docRef: MockRef): Promise<MockDocumentSnapshot> {
  const db = getLocalDatabase();
  const pathParts = docRef.path.split('/');
  
  // Navigate the local database tree
  let current = db;
  for (let i = 0; i < pathParts.length; i++) {
    const key = pathParts[i];
    if (current && current[key] !== undefined) {
      current = current[key];
    } else {
      current = undefined;
      break;
    }
  }

  const exists = current !== undefined && current !== null;
  return new MockDocumentSnapshot(docRef.id || '', exists ? current : null, exists);
}

export async function getDocFromServer(docRef: MockRef): Promise<MockDocumentSnapshot> {
  return getDoc(docRef);
}

function evaluateDocumentWithConstraints(docId: string, docData: any, constraints: QueryConstraint[]): boolean {
  for (const constraint of constraints) {
    if (constraint.type === 'where') {
      const { field, operator, value } = constraint;
      if (!field) continue;
      const docVal = docData[field];
      
      // Support nested timestamps
      let evaluatedDocVal = docVal;
      let evaluatedTargetVal = value;

      if (docVal && typeof docVal === 'object' && docVal.seconds !== undefined) {
        evaluatedDocVal = docVal.seconds * 1000 + (docVal.nanoseconds || 0) / 1000000;
      } else if (docVal instanceof Date) {
        evaluatedDocVal = docVal.getTime();
      }

      if (value && typeof value === 'object' && value.seconds !== undefined) {
        evaluatedTargetVal = value.seconds * 1000 + (value.nanoseconds || 0) / 1000000;
      } else if (value instanceof Date) {
        evaluatedTargetVal = value.getTime();
      }

      if (operator === '==') {
        if (evaluatedDocVal !== evaluatedTargetVal) return false;
      } else if (operator === '!=') {
        if (evaluatedDocVal === evaluatedTargetVal) return false;
      } else if (operator === '>') {
        if (!(evaluatedDocVal > evaluatedTargetVal)) return false;
      } else if (operator === '>=') {
        if (!(evaluatedDocVal >= evaluatedTargetVal)) return false;
      } else if (operator === '<') {
        if (!(evaluatedDocVal < evaluatedTargetVal)) return false;
      } else if (operator === '<=') {
        if (!(evaluatedDocVal <= evaluatedTargetVal)) return false;
      } else if (operator === 'array-contains') {
        if (!Array.isArray(docVal) || !docVal.includes(value)) return false;
      }
    }
  }
  return true;
}

export async function getDocs(queryOrRef: MockRef | MockQuery): Promise<MockQuerySnapshot> {
  const isQuery = queryOrRef instanceof MockQuery;
  const ref = isQuery ? (queryOrRef as MockQuery).collRef : (queryOrRef as MockRef);
  const constraints = isQuery ? (queryOrRef as MockQuery).constraints : [];

  const db = getLocalDatabase();
  const pathParts = ref.path.split('/');
  
  let collectionObj = db;
  for (const part of pathParts) {
    if (collectionObj && collectionObj[part] !== undefined) {
      collectionObj = collectionObj[part];
    } else {
      collectionObj = {};
      break;
    }
  }

  // Map subcollection map structure id -> data to array
  let results: any[] = [];
  if (collectionObj && typeof collectionObj === 'object') {
    results = Object.keys(collectionObj).map(id => ({
      id,
      ...collectionObj[id]
    }));
  }

  // Filter based on queries where constraints
  results = results.filter(item => evaluateDocumentWithConstraints(item.id, item, constraints));

  // Sort based on orderBy constraints
  const orderConstraint = constraints.find(c => c.type === 'orderBy');
  if (orderConstraint) {
    const field = orderConstraint.field;
    const direction = orderConstraint.direction || 'asc';
    results.sort((a, b) => {
      let valA = a[field!];
      let valB = b[field!];

      // Convert Timestamps or Dates nicely
      if (valA && typeof valA === 'object' && valA.seconds !== undefined) {
        valA = valA.seconds * 1000 + (valA.nanoseconds || 0) / 1000000;
      } else if (valA instanceof Date) {
        valA = valA.getTime();
      } else if (typeof valA === 'string' && !isNaN(Date.parse(valA))) {
        valA = Date.parse(valA);
      }

      if (valB && typeof valB === 'object' && valB.seconds !== undefined) {
        valB = valB.seconds * 1000 + (valB.nanoseconds || 0) / 1000000;
      } else if (valB instanceof Date) {
        valB = valB.getTime();
      } else if (typeof valB === 'string' && !isNaN(Date.parse(valB))) {
        valB = Date.parse(valB);
      }

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    // If no order is specified, default to descending by publishedAt or createdAt if present
    results.sort((a, b) => {
      const timeA = (a.publishedAt?.seconds || a.createdAt?.seconds || Date.now());
      const timeB = (b.publishedAt?.seconds || b.createdAt?.seconds || 0);
      return timeB - timeA;
    });
  }

  // Apply limit constraints
  const limitConstraint = constraints.find(c => c.type === 'limit');
  if (limitConstraint && limitConstraint.count !== undefined) {
    results = results.slice(0, limitConstraint.count);
  }

  // Wrap in Document Snapshots
  const docSnaps = results.map(item => {
    const { id, ...data } = item;
    return new MockDocumentSnapshot(id, data, true);
  });

  return new MockQuerySnapshot(docSnaps);
}

export async function getCountFromServer(queryOrRef: MockRef | MockQuery) {
  const snapshot = await getDocs(queryOrRef);
  return {
    data: () => ({
      count: snapshot.docs.length
    })
  };
}

export function onSnapshot(
  queryOrRef: MockRef | MockQuery,
  onNext: (snapshot: any) => void,
  onError?: (error: Error) => void
) {
  const runListener = async () => {
    try {
      const isDoc = queryOrRef instanceof MockRef && (queryOrRef as MockRef).type === 'doc';
      if (isDoc) {
        const snap = await getDoc(queryOrRef as MockRef);
        onNext(snap);
      } else {
        const snap = await getDocs(queryOrRef);
        onNext(snap);
      }
    } catch (e) {
      if (onError && e instanceof Error) {
        onError(e);
      } else {
        console.error('onSnapshot error:', e);
      }
    }
  };

  runListener(); // run immediately
  listeners.add(runListener);

  return () => {
    listeners.delete(runListener);
  };
}

// Deep writes helper
function setDeepProperty(obj: any, path: string, value: any) {
  const pathParts = path.split('/');
  let current = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part];
  }
  
  const lastKey = pathParts[pathParts.length - 1];
  
  // Resolve value if any key contains serverTimestamp proxy or increment
  let finalValue = value;
  if (value && typeof value === 'object') {
    if (value instanceof MockIncrement) {
      const existing = current[lastKey] || 0;
      finalValue = Number(existing) + value.value;
    } else if (value instanceof Timestamp) {
      finalValue = { seconds: value.seconds, nanoseconds: value.nanoseconds };
    } else {
      // Loop fields
      const copy = { ...value };
      for (const k in copy) {
        if (copy[k] instanceof MockIncrement) {
          const existing = (current[lastKey] && current[lastKey][k]) || 0;
          copy[k] = Number(existing) + copy[k].value;
        } else if (copy[k] instanceof Timestamp) {
          copy[k] = { seconds: copy[k].seconds, nanoseconds: copy[k].nanoseconds };
        }
      }
      finalValue = copy;
    }
  }

  current[lastKey] = finalValue;
}

export async function addDoc(collRef: MockRef, data: any): Promise<MockRef> {
  const db = getLocalDatabase();
  const id = 'mock_id_' + Math.random().toString(36).substring(2, 11);
  const docRef = doc(collRef, id);
  
  const docData = { ...data, id };
  
  // Replace serverTimestamp
  for (const k in docData) {
    if (docData[k] && typeof docData[k] === 'object' && docData[k].seconds !== undefined && docData[k].nanoseconds !== undefined) {
      // Already a timestamp representation
    } else if (docData[k] === undefined) {
      delete docData[k];
    }
  }

  setDeepProperty(db, docRef.path, docData);
  saveLocalDatabase(db);
  return docRef;
}

export async function setDoc(docRef: MockRef, data: any, options?: { merge?: boolean }): Promise<void> {
  const db = getLocalDatabase();
  
  let finalData = { ...data };
  if (options?.merge) {
    // Merge existing
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      finalData = { ...existingSnap.data(), ...data };
    }
  }

  setDeepProperty(db, docRef.path, finalData);
  saveLocalDatabase(db);
}

export async function updateDoc(docRef: MockRef, data: any): Promise<void> {
  const db = getLocalDatabase();
  const pathParts = docRef.path.split('/');
  
  let current = db;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part];
  }

  const lastKey = pathParts[pathParts.length - 1];
  const existing = current[lastKey] || {};

  // For flat key updates or nested keys
  const updated = { ...existing };
  for (const k in data) {
    const val = data[k];
    if (val instanceof MockIncrement) {
      const prev = updated[k] || 0;
      updated[k] = Number(prev) + val.value;
    } else if (val instanceof Timestamp) {
      updated[k] = { seconds: val.seconds, nanoseconds: val.nanoseconds };
    } else {
      updated[k] = val;
    }
  }

  current[lastKey] = updated;
  saveLocalDatabase(db);
}

export async function deleteDoc(docRef: MockRef): Promise<void> {
  const db = getLocalDatabase();
  const pathParts = docRef.path.split('/');
  
  let current = db;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (current && current[part] !== undefined) {
      current = current[part];
    } else {
      return; // already deleted
    }
  }

  const lastKey = pathParts[pathParts.length - 1];
  if (current && current[lastKey] !== undefined) {
    delete current[lastKey];
    saveLocalDatabase(db);
  }
}

export async function runTransaction(dbInstance: MockDb, callback: (transaction: any) => Promise<any>): Promise<any> {
  const transactionDb = getLocalDatabase();
  const pendingWrites: (() => void)[] = [];

  const transactionSetDeepProperty = (obj: any, path: string, val: any) => {
    const parts = path.split('/');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = val;
  };

  const transaction = {
    get: async (docRef: MockRef) => {
      const pathParts = docRef.path.split('/');
      let current = transactionDb;
      for (const part of pathParts) {
        if (current && current[part] !== undefined) {
          current = current[part];
        } else {
          current = undefined;
          break;
        }
      }
      const exists = current !== undefined && current !== null;
      return new MockDocumentSnapshot(docRef.id || '', exists ? current : null, exists);
    },
    update: async (docRef: MockRef, data: any) => {
      pendingWrites.push(() => {
        const pathParts = docRef.path.split('/');
        let current = transactionDb;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (current[part] === undefined) {
            current[part] = {};
          }
          current = current[part];
        }
        const lastKey = pathParts[pathParts.length - 1];
        const existing = current[lastKey] || {};
        const updated = { ...existing };
        for (const k in data) {
          const val = data[k];
          if (val instanceof MockIncrement) {
            const prev = updated[k] || 0;
            updated[k] = Number(prev) + val.value;
          } else if (val instanceof Timestamp) {
            updated[k] = { seconds: val.seconds, nanoseconds: val.nanoseconds };
          } else {
            updated[k] = val;
          }
        }
        current[lastKey] = updated;
      });
    },
    set: async (docRef: MockRef, data: any, options?: any) => {
      pendingWrites.push(() => {
        let finalData = { ...data };
        if (options?.merge) {
          const pathParts = docRef.path.split('/');
          let current = transactionDb;
          for (const part of pathParts) {
            if (current && current[part] !== undefined) {
              current = current[part];
            } else {
              current = undefined;
              break;
            }
          }
          if (current !== undefined && current !== null) {
            finalData = { ...current, ...data };
          }
        }
        transactionSetDeepProperty(transactionDb, docRef.path, finalData);
      });
    },
    delete: async (docRef: MockRef) => {
      pendingWrites.push(() => {
        const pathParts = docRef.path.split('/');
        let current = transactionDb;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (current && current[part] !== undefined) {
            current = current[part];
          } else {
            return;
          }
        }
        const lastKey = pathParts[pathParts.length - 1];
        if (current && current[lastKey] !== undefined) {
          delete current[lastKey];
        }
      });
    }
  };

  const result = await callback(transaction);

  for (const write of pendingWrites) {
    write();
  }
  saveLocalDatabase(transactionDb);

  return result;
}
