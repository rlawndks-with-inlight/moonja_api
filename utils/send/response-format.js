import { response } from "../util.js";

const returnFormat = (number, message) => {
    return {
        number, message
    }
}
/*
100 성공
-1000 유효한 회원이 아닙니다.
-2000 유효한 send_type이 아닙니다.
-2001 유효한 sender가 아닙니다.
-2002 유효한 receiver가 아닙니다.
-2050 파일 등록중 에러
-2051 파일 용량은 3byte 미만이어야 합니다.
-2100 허용되지 않은 ip입니다.
-2150 허용되지 않은 key입니다.
-2150 허용되지 않은 user_id 입니다.
-2200 sms일시 
-2300 lms일시
-2400 mms일시
-2500 카카오 알림톡일시
-2600 카카오 알림톡일시
-2700 카카오 친구톡일시
-2800 카카오 친구톡일시
-5000 알 수 없는 에러
*/
const returnResponse = (req, res, num, data = {}, msg) => {
    let return_obj = returnFormat(-5000, '');
    switch (num) {
        case 100:
            return_obj = returnFormat(num, 'success');
            break;
        case -150:
            return_obj = returnFormat(num, '권한이 없습니다.');
            break;
        case -200:
            return_obj = returnFormat(num, '예치금이 부족합니다.');
            break;
        case -995:
            return_obj = returnFormat(num, '발신번호 에러.');
            break;
        case -996:
            return_obj = returnFormat(num, '허용된 ip가 아닙니다.');
            break;
        case -997:
            return_obj = returnFormat(num, '파라미터가 잘못되었습니다.');
            break;
        case -998:
            return_obj = returnFormat(num, '범위에 벗어나는 값입니다.');
            break;
        case -999:
            return_obj = returnFormat(num, '필수값을 입력해 주세요.');
            break;
        case -1000:
            return_obj = returnFormat(num, '유효한 회원이 아닙니다.');
            break;
        case -1001:
            return_obj = returnFormat(num, '토큰값이 잘못되었습니다.');
            break;
        case -1002:
            return_obj = returnFormat(num, '토큰이 만료되었습니다.');
            break;
        case -1003:
            return_obj = returnFormat(num, '템플릿코드가 잘못되었습니다.');
            break;
        case -2000:
            return_obj = returnFormat(num, '');
            break;
        case -2001:
            return_obj = returnFormat(num, '');
            break;
        case -2002:
            return_obj = returnFormat(num, '');
            break;
        case -2050:
            return_obj = returnFormat(num, '');
            break;
        case -2051:
            return_obj = returnFormat(num, '');
            break;
        case -2100:
            return_obj = returnFormat(num, '');
            break;
        case -2150:
            return_obj = returnFormat(num, '');
            break;
        case -2200:
            return_obj = returnFormat(num, '');
            break;
        case -2300:
            return_obj = returnFormat(num, '');
            break;
        case -2400:
            return_obj = returnFormat(num, '유효한 content 형식이 아닙니다.');
            break;
        case -2500:
            return_obj = returnFormat(num, 'msg_type이 유효하지 않습니다.');
            break;
        case -2501:
            return_obj = returnFormat(num, '이미지 형식 발송은 하나만 가능합니다.');
            break;
        case -2502:
            return_obj = returnFormat(num, '파일 크기는 최대 300kbyte 입니다.');
            break;
        case -2503:
            return_obj = returnFormat(num, 'msg 길이는 최대 한글기준 1000자 입니다.');
            break;


        case -2600:
            return_obj = returnFormat(num, '유효한 button name 이 아닙니다.');
            break;
        case -2601:
            return_obj = returnFormat(num, '유효한 button linkType 이 아닙니다.');
            break;
        case -2602:
            return_obj = returnFormat(num, '');
            break;
        case -2603:
            return_obj = returnFormat(num, '');
            break;
        case -2604:
            return_obj = returnFormat(num, '');
            break;

        case -2700:
            return_obj = returnFormat(num, '');
            break;
        case -2800:
            return_obj = returnFormat(num, '');
            break;
        case -4000:
            return_obj = returnFormat(num, '파일 등록중 에러');
        case -4001:
            return_obj = returnFormat(num, '파일 크기는 최대 300kbyte 입니다.');
        case -4002:
            return_obj = returnFormat(num, '이미지 크기는 가로세로 기준 1000px 이하 이어야 합니다.');
            break;
        case -4500:
            return_obj = returnFormat(num, '처리중 에러');
            break;
        case -5000:
            return_obj = returnFormat(num, 'server error');
            break;
    }
    return response(req, res, num, msg || return_obj.message, data)
}

export default returnResponse;